import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { scryptSync, timingSafeEqual } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'plbse-admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'local-dev-session-secret';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const VALID_STATUSES = new Set(['draft', 'pending_review', 'needs_changes', 'approved', 'submitted_to_plbse']);
const TEACHER_COOKIE = 'teacher_portal_session';
const ADMIN_COOKIE = 'admin_portal_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;

const defaultSubmission = {
  status: 'draft',
  teacherNotes: '',
  adminNotes: '',
  requestedAt: '',
  reviewedAt: '',
  submittedToPlbseAt: '',
  reviewerName: '',
};

const defaultDb = {
  teachers: [],
  activities: [],
  auditLog: [],
};

let mutationQueue = Promise.resolve();

await ensureStorage();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const cookies = parseCookies(request.headers.cookie || '');
    const teacherSession = readSessionCookie(cookies[TEACHER_COOKIE], 'teacher');
    const adminSession = readSessionCookie(cookies[ADMIN_COOKIE], 'admin');

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url, { teacherSession, adminSession });
      return;
    }

    if (url.pathname.startsWith('/uploads/')) {
      await serveUpload(response, url.pathname, { teacherSession, adminSession });
      return;
    }

    if (url.pathname.startsWith('/packet/')) {
      await servePacket(response, url.pathname, { teacherSession, adminSession });
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    sendJson(response, status, { error: error.message || 'Internal server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Teacher CEU portal running at http://${HOST}:${PORT}`);
});

async function handleApi(request, response, url, sessions) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/session') {
    const body = await readJsonBody(request);
    const name = requireString(body.name, 'Teacher name is required.');
    const email = requireString(body.email, 'School email is required.').toLowerCase();
    const school = requireString(body.school, 'School or district is required.');
    const password = requireString(body.password, 'Password is required.');

    let teacherId = '';
    const payload = await runMutation(async (db) => {
      let teacher = db.teachers.find((entry) => entry.email === email);

      if (!teacher) {
        throw createHttpError(403, 'Teacher account has not been provisioned yet. Ask an admin to create it.');
      }

      ensureTeacherPassword(teacher);
      teacher.isActive = teacher.isActive !== false;
      if (!teacher.isActive) {
        throw createHttpError(403, 'This teacher account is inactive. Contact an admin for access.');
      }
      if (!verifyPassword(password, teacher.passwordSalt, teacher.passwordHash)) {
        throw createHttpError(403, 'Email or password is incorrect.');
      }

      teacher.name = name;
      teacher.school = school;
      teacher.lastLoginAt = new Date().toISOString();
      teacher.profile = {
        teacherName: name,
        schoolName: school,
        licenseArea: '',
        renewalCycle: '',
        hoursTarget: 120,
        ...(teacher.profile ?? {}),
      };
      teacher.submission = {
        ...defaultSubmission,
        ...(teacher.submission ?? {}),
      };
      addAuditEvent(db, {
        actor: `Teacher:${email}`,
        subject: teacher.id,
        action: 'teacher_login',
        details: 'Teacher signed in successfully.',
      });

      teacherId = teacher.id;
      return buildPortalPayload(db, teacher.id);
    });

    setCookie(response, TEACHER_COOKIE, createSessionCookie('teacher', teacherId), {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: 'Lax',
      path: '/',
    });
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/session/me') {
    if (!sessions.teacherSession) {
      sendJson(response, 200, { teacher: null });
      return;
    }

    const db = await readDb();
    const teacher = getTeacher(db, sessions.teacherSession.subject);
    if (!isTeacherActive(teacher)) {
      clearCookie(response, TEACHER_COOKIE);
      sendJson(response, 200, {
        teacher: null,
        sessionClosed: true,
        reason: 'inactive',
        message: 'This teacher account is inactive. Contact an admin for access.',
      });
      return;
    }

    sendJson(response, 200, buildPortalPayload(db, sessions.teacherSession.subject));
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/session/logout') {
    clearCookie(response, TEACHER_COOKIE);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/session/change-password') {
    const teacherId = requireTeacherSession(sessions).subject;
    const body = await readJsonBody(request);
    const currentPassword = requireString(body.currentPassword, 'Current password is required.');
    const newPassword = requireString(body.newPassword, 'New password is required.');

    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      assertTeacherIsActive(teacher);
      ensureTeacherPassword(teacher);
      if (!verifyPassword(currentPassword, teacher.passwordSalt, teacher.passwordHash)) {
        throw createHttpError(403, 'Current password is incorrect.');
      }

      teacher.passwordSalt = createSalt();
      teacher.passwordHash = hashPassword(newPassword, teacher.passwordSalt);
      addAuditEvent(db, {
        actor: `Teacher:${teacher.email}`,
        subject: teacher.id,
        action: 'teacher_password_changed',
        details: 'Teacher changed their own password.',
      });

      return { ok: true };
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'PUT' && url.pathname === '/api/profile') {
    const teacherId = requireTeacherSession(sessions).subject;
    const body = await readJsonBody(request);
    const profile = body.profile ?? {};
    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      assertTeacherIsActive(teacher);

      teacher.profile = {
        teacherName: sanitizeText(profile.teacherName, 120) || teacher.name,
        schoolName: sanitizeText(profile.schoolName, 120) || teacher.school,
        licenseArea: sanitizeText(profile.licenseArea, 120),
        renewalCycle: sanitizeText(profile.renewalCycle, 120),
        hoursTarget: normalizeHoursTarget(profile.hoursTarget),
      };

      return buildPortalPayload(db, teacherId);
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/activities') {
    const teacherId = requireTeacherSession(sessions).subject;
    const body = await readJsonBody(request);
    const activityInput = body.activity ?? {};
    const file = activityInput.file ?? {};
    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      assertTeacherIsActive(teacher);
      const storedFile = await storeUploadedFile(teacherId, file);

      const activity = {
        id: crypto.randomUUID(),
        teacherId,
        title: requireString(activityInput.title, 'Activity title is required.'),
        provider: requireString(activityInput.provider, 'Provider is required.'),
        completedOn: requireString(activityInput.completedOn, 'Completion date is required.'),
        hours: normalizeHours(activityInput.hours),
        type: sanitizeText(activityInput.type, 80) || 'Certificate',
        notes: sanitizeText(activityInput.notes, 1000),
        fileName: storedFile.fileName,
        fileSize: storedFile.fileSize,
        fileType: storedFile.fileType,
        filePath: storedFile.filePath,
        fileUrl: storedFile.fileUrl,
        uploadedAt: new Date().toISOString(),
      };

      resetTeacherSubmissionIfNeeded(teacher);
      db.activities.unshift(activity);
      return buildPortalPayload(db, teacherId);
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'DELETE' && url.pathname.startsWith('/api/activities/')) {
    const teacherId = requireTeacherSession(sessions).subject;
    const activityId = decodeURIComponent(url.pathname.split('/').pop() || '');
    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      assertTeacherIsActive(teacher);
      const activity = db.activities.find((entry) => entry.id === activityId && entry.teacherId === teacherId);
      if (!activity) {
        throw createHttpError(404, 'Activity not found.');
      }

      resetTeacherSubmissionIfNeeded(teacher);
      db.activities = db.activities.filter((entry) => entry.id !== activityId);
      await deleteFileIfPresent(activity.filePath);
      return buildPortalPayload(db, teacherId);
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/submission/request-review') {
    const teacherId = requireTeacherSession(sessions).subject;
    const body = await readJsonBody(request);
    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      assertTeacherIsActive(teacher);
      const activityCount = db.activities.filter((entry) => entry.teacherId === teacherId).length;
      if (activityCount === 0) {
        throw createHttpError(400, 'Add at least one CEU activity before requesting review.');
      }

      teacher.submission = {
        ...defaultSubmission,
        ...(teacher.submission ?? {}),
        status: 'pending_review',
        requestedAt: new Date().toISOString(),
        teacherNotes: sanitizeText(body.teacherNotes ?? teacher.submission.teacherNotes, 1000),
      };

      return buildPortalPayload(db, teacherId);
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/session') {
    const body = await readJsonBody(request);
    const adminName = requireString(body.adminName, 'Admin name is required.');
    validateAdminCode(body.code);
    const db = await readDb();

    setCookie(response, ADMIN_COOKIE, createSessionCookie('admin', adminName), {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: 'Lax',
      path: '/',
    });

    sendJson(response, 200, {
      session: { name: adminName },
      queue: buildAdminQueue(db),
      auditLog: buildAuditLog(db),
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/session') {
    if (!sessions.adminSession) {
      sendJson(response, 200, { session: null, queue: [] });
      return;
    }

    const db = await readDb();
    sendJson(response, 200, {
      session: { name: sessions.adminSession.subject },
      queue: buildAdminQueue(db),
      auditLog: buildAuditLog(db),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
    clearCookie(response, ADMIN_COOKIE);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/overview') {
    requireAdminSession(sessions);
    const db = await readDb();
    sendJson(response, 200, { queue: buildAdminQueue(db), auditLog: buildAuditLog(db) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/teachers') {
    requireAdminSession(sessions);
    const body = await readJsonBody(request);
    const teacherName = requireString(body.teacherName, 'Teacher name is required.');
    const email = requireString(body.email, 'School email is required.').toLowerCase();
    const school = requireString(body.school, 'School or district is required.');
    const password = requireString(body.password, 'Initial password is required.');

    const payload = await runMutation(async (db) => {
      if (db.teachers.some((entry) => entry.email === email)) {
        throw createHttpError(409, 'A teacher account with that email already exists.');
      }

      const teacher = {
        id: crypto.randomUUID(),
        email,
        name: teacherName,
        school,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
        lastReminderAt: '',
        passwordSalt: createSalt(),
        passwordHash: '',
        profile: {
          teacherName,
          schoolName: school,
          licenseArea: '',
          renewalCycle: '',
          hoursTarget: 120,
        },
        submission: { ...defaultSubmission },
      };
      teacher.passwordHash = hashPassword(password, teacher.passwordSalt);
      db.teachers.unshift(teacher);
      addAuditEvent(db, {
        actor: `Admin:${sessions.adminSession.subject}`,
        subject: teacher.id,
        action: 'teacher_account_created',
        details: `Provisioned teacher account for ${teacher.email}.`,
      });

      return {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
        },
        queue: buildAdminQueue(db),
        auditLog: buildAuditLog(db),
      };
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/admin/teachers/') && url.pathname.endsWith('/reset-password')) {
    requireAdminSession(sessions);
    const body = await readJsonBody(request);
    const password = requireString(body.password, 'New password is required.');
    const teacherId = decodeURIComponent(url.pathname.split('/')[4] || '');

    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      teacher.passwordSalt = createSalt();
      teacher.passwordHash = hashPassword(password, teacher.passwordSalt);
      addAuditEvent(db, {
        actor: `Admin:${sessions.adminSession.subject}`,
        subject: teacher.id,
        action: 'teacher_password_reset',
        details: `Password reset for ${teacher.email}.`,
      });
      return { queue: buildAdminQueue(db), auditLog: buildAuditLog(db) };
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/admin/teachers/') && url.pathname.endsWith('/status')) {
    requireAdminSession(sessions);
    const body = await readJsonBody(request);
    const teacherId = decodeURIComponent(url.pathname.split('/')[4] || '');
    const isActive = Boolean(body.isActive);

    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      teacher.isActive = isActive;
      addAuditEvent(db, {
        actor: `Admin:${sessions.adminSession.subject}`,
        subject: teacher.id,
        action: isActive ? 'teacher_account_reactivated' : 'teacher_account_deactivated',
        details: `${isActive ? 'Reactivated' : 'Deactivated'} account for ${teacher.email}.`,
      });

      return { queue: buildAdminQueue(db), auditLog: buildAuditLog(db) };
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/admin/teachers/') && url.pathname.endsWith('/reminder')) {
    const adminSession = requireAdminSession(sessions);
    const body = await readJsonBody(request);
    const teacherId = decodeURIComponent(url.pathname.split('/')[4] || '');
    const message = requireString(body.message, 'Reminder message is required.');

    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      teacher.lastReminderAt = new Date().toISOString();
      addAuditEvent(db, {
        actor: `Admin:${adminSession.subject}`,
        subject: teacher.id,
        action: 'teacher_reminder_logged',
        details: `Reminder logged for ${teacher.email}: ${sanitizeText(message, 240)}`,
      });

      return { queue: buildAdminQueue(db), auditLog: buildAuditLog(db) };
    });

    sendJson(response, 200, payload);
    return;
  }

  if (request.method === 'PUT' && url.pathname.startsWith('/api/admin/submissions/')) {
    const adminSession = requireAdminSession(sessions);
    const teacherId = decodeURIComponent(url.pathname.split('/').pop() || '');
    const body = await readJsonBody(request);
    const status = normalizeSubmissionStatus(body.status);
    const payload = await runMutation(async (db) => {
      const teacher = getTeacher(db, teacherId);
      teacher.submission = {
        ...defaultSubmission,
        ...(teacher.submission ?? {}),
        status,
        adminNotes: sanitizeText(body.reviewNotes, 1000),
        reviewerName: adminSession.subject,
        reviewedAt: new Date().toISOString(),
        submittedToPlbseAt: status === 'submitted_to_plbse' ? new Date().toISOString() : '',
      };

      if (status !== 'pending_review' && !teacher.submission.requestedAt) {
        teacher.submission.requestedAt = new Date().toISOString();
      }

      addAuditEvent(db, {
        actor: `Admin:${adminSession.subject}`,
        subject: teacher.id,
        action: 'submission_status_updated',
        details: `Submission marked ${status}.`,
      });
      return { queue: buildAdminQueue(db), auditLog: buildAuditLog(db) };
    });

    sendJson(response, 200, payload);
    return;
  }

  throw createHttpError(404, 'Route not found.');
}

async function serveStatic(response, pathname) {
  const targetPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const safePath = path.normalize(targetPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    throw createHttpError(403, 'Forbidden.');
  }

  const content = await fs.readFile(filePath);
  response.writeHead(200, { 'Content-Type': getMimeType(filePath) });
  response.end(content);
}

async function serveUpload(response, pathname, sessions) {
  const relativePath = pathname.replace(/^\/uploads\//, '');
  const filePath = path.join(UPLOADS_DIR, relativePath);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    throw createHttpError(403, 'Forbidden.');
  }

  const teacherId = relativePath.split('/')[0];
  await authorizeTeacherOrAdmin(sessions, teacherId);
  const content = await fs.readFile(filePath);
  response.writeHead(200, { 'Content-Type': getMimeType(filePath) });
  response.end(content);
}

async function servePacket(response, pathname, sessions) {
  const teacherId = decodeURIComponent(pathname.replace(/^\/packet\//, '').trim());
  if (!teacherId) {
    throw createHttpError(404, 'Packet not found.');
  }

  await authorizeTeacherOrAdmin(sessions, teacherId);
  const db = await readDb();
  const teacher = getTeacher(db, teacherId);
  const activities = db.activities.filter((activity) => activity.teacherId === teacherId);
  const html = buildPacketHtml(teacher, activities);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
}

async function ensureStorage() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2));
  }
}

async function readDb() {
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const teachers = Array.isArray(parsed.teachers) ? parsed.teachers : [];

  teachers.forEach((teacher) => {
    teacher.profile = {
      teacherName: teacher.name || '',
      schoolName: teacher.school || '',
      licenseArea: '',
      renewalCycle: '',
      hoursTarget: 120,
      ...(teacher.profile ?? {}),
    };
    teacher.isActive = teacher.isActive !== false;
    teacher.submission = {
      ...defaultSubmission,
      ...(teacher.submission ?? {}),
    };
    ensureTeacherPassword(teacher);
  });

  return {
    teachers,
    activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
  };
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function runMutation(mutator) {
  const run = mutationQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  mutationQueue = run.catch(() => {});
  return run;
}

function buildPortalPayload(db, teacherId) {
  const teacher = getTeacher(db, teacherId);
  return {
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      school: teacher.school,
    },
    profile: teacher.profile,
    submission: teacher.submission,
    activities: db.activities
      .filter((activity) => activity.teacherId === teacherId)
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        provider: activity.provider,
        completedOn: activity.completedOn,
        hours: activity.hours,
        type: activity.type,
        notes: activity.notes,
        fileName: activity.fileName,
        fileSize: activity.fileSize,
        fileType: activity.fileType,
        fileUrl: activity.fileUrl,
        uploadedAt: activity.uploadedAt,
      })),
  };
}

function buildAdminQueue(db) {
  return db.teachers
    .map((teacher) => {
      const activities = db.activities.filter((activity) => activity.teacherId === teacher.id);
      const loggedHours = activities.reduce((total, activity) => total + (Number(activity.hours) || 0), 0);
      return {
        teacherId: teacher.id,
        teacherName: teacher.profile.teacherName || teacher.name,
        email: teacher.email,
        schoolName: teacher.profile.schoolName || teacher.school,
        createdAt: teacher.createdAt || '',
        lastLoginAt: teacher.lastLoginAt || '',
        lastReminderAt: teacher.lastReminderAt || '',
        isActive: teacher.isActive !== false,
        licenseArea: teacher.profile.licenseArea,
        renewalCycle: teacher.profile.renewalCycle,
        targetHours: teacher.profile.hoursTarget,
        loggedHours,
        activityCount: activities.length,
        fileCount: activities.filter((activity) => activity.fileUrl).length,
        submission: teacher.submission,
      };
    })
    .sort((left, right) => {
      const priority = {
        pending_review: 0,
        needs_changes: 1,
        approved: 2,
        submitted_to_plbse: 3,
        draft: 4,
      };
      return (
        (priority[left.submission.status] ?? 99) - (priority[right.submission.status] ?? 99) ||
        left.teacherName.localeCompare(right.teacherName)
      );
    });
}

function buildAuditLog(db) {
  return [...(db.auditLog || [])]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 30);
}

function getTeacher(db, teacherId) {
  const teacher = db.teachers.find((entry) => entry.id === teacherId);
  if (!teacher) {
    throw createHttpError(404, 'Teacher workspace was not found. Please sign in again.');
  }
  return teacher;
}

function isTeacherActive(teacher) {
  return teacher.isActive !== false;
}

function assertTeacherIsActive(teacher) {
  if (!isTeacherActive(teacher)) {
    throw createHttpError(403, 'This teacher account is inactive. Contact an admin for access.');
  }
}

function ensureTeacherPassword(teacher) {
  teacher.passwordSalt = teacher.passwordSalt || createSalt();
  teacher.passwordHash = teacher.passwordHash || hashPassword('changeme123', teacher.passwordSalt);
}

function createSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function resetTeacherSubmissionIfNeeded(teacher) {
  teacher.submission = {
    ...defaultSubmission,
    ...(teacher.submission ?? {}),
  };

  if (teacher.submission.status === 'approved' || teacher.submission.status === 'submitted_to_plbse') {
    teacher.submission.status = 'draft';
    teacher.submission.adminNotes = '';
    teacher.submission.reviewedAt = '';
    teacher.submission.submittedToPlbseAt = '';
    teacher.submission.reviewerName = '';
  }
}

function addAuditEvent(db, event) {
  db.auditLog.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    actor: event.actor,
    subject: event.subject,
    action: event.action,
    details: event.details || '',
  });
  db.auditLog = db.auditLog.slice(0, 200);
}

function createSessionCookie(role, subject) {
  const payload = {
    role,
    subject,
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function readSessionCookie(value, role) {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split('.');
  if (!encoded || !signature || signValue(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.role !== role || Number(payload.expiresAt) < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function signValue(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

async function authorizeTeacherOrAdmin(sessions, teacherId) {
  if (sessions.adminSession) {
    return;
  }
  if (!sessions.teacherSession || sessions.teacherSession.subject !== teacherId) {
    throw createHttpError(403, 'You do not have access to this record.');
  }

  const db = await readDb();
  const teacher = getTeacher(db, teacherId);
  assertTeacherIsActive(teacher);
}

function requireTeacherSession(sessions) {
  if (!sessions.teacherSession) {
    throw createHttpError(401, 'Sign in to continue.');
  }
  return sessions.teacherSession;
}

function requireAdminSession(sessions) {
  if (!sessions.adminSession) {
    throw createHttpError(401, 'Admin sign-in is required.');
  }
  return sessions.adminSession;
}

async function storeUploadedFile(teacherId, file) {
  const fileName = sanitizeFileName(requireString(file.name, 'A CEU file is required.'));
  const dataUrl = requireString(file.dataUrl, 'Uploaded file data is missing.');
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw createHttpError(400, 'Uploaded file format is not supported.');
  }

  const [, fileType, base64Content] = match;
  const content = Buffer.from(base64Content, 'base64');
  const teacherDir = path.join(UPLOADS_DIR, teacherId);
  await fs.mkdir(teacherDir, { recursive: true });

  const activityId = crypto.randomUUID();
  const storedFileName = `${activityId}-${fileName}`;
  const storedPath = path.join(teacherDir, storedFileName);
  await fs.writeFile(storedPath, content);

  return {
    fileName,
    fileSize: Number(file.size) || content.length,
    fileType,
    filePath: storedPath,
    fileUrl: `/uploads/${teacherId}/${storedFileName}`,
  };
}

async function deleteFileIfPresent(filePath) {
  if (!filePath) {
    return;
  }
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore already-removed files during cleanup.
  }
}

function buildPacketHtml(teacher, activities) {
  const loggedHours = activities.reduce((total, activity) => total + (Number(activity.hours) || 0), 0);
  const statusLabel = formatSubmissionStatus(teacher.submission.status);
  const renderedActivities = activities.length
    ? activities.map((activity, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(activity.title)}</td>
              <td>${escapeHtml(activity.provider)}</td>
              <td>${escapeHtml(formatDate(activity.completedOn))}</td>
              <td>${escapeHtml(String(activity.hours))}</td>
              <td>${escapeHtml(activity.type)}</td>
              <td>${activity.fileUrl ? `<a href="${escapeHtml(activity.fileUrl)}">Open file</a>` : 'Missing file'}</td>
              <td>${escapeHtml(activity.notes || '')}</td>
            </tr>`).join('')
    : `<tr><td colspan="8">No CEU activities have been added yet.</td></tr>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PLBSE Packet - ${escapeHtml(teacher.profile.teacherName || teacher.name)}</title>
    <style>
      :root { color-scheme: light; --ink:#20303d; --muted:#5d6b76; --line:#d7ddd8; --bg:#f7f3ec; --card:#ffffff; --accent:#0f766e; }
      * { box-sizing:border-box; } body { margin:0; font-family:"Avenir Next","Segoe UI",sans-serif; color:var(--ink); background:var(--bg); }
      main { width:min(1040px, calc(100vw - 2rem)); margin:0 auto; padding:2rem 0 3rem; }
      .page-head,.card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:1.25rem; }
      .page-head { margin-bottom:1rem; } .eyebrow { margin:0 0 .35rem; font-size:.78rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); font-weight:700; }
      h1,h2 { margin:0; } .head-row,.summary-grid { display:grid; gap:1rem; } .head-row { grid-template-columns:minmax(0,1fr) auto; align-items:start; }
      .badge { display:inline-flex; align-items:center; justify-content:center; min-height:2rem; border-radius:999px; padding:.4rem .8rem; background:rgba(15,118,110,.12); color:var(--accent); font-weight:700; }
      .summary-grid { grid-template-columns:repeat(3, minmax(0,1fr)); margin-top:1rem; } .summary-item strong,.notes strong { display:block; margin-bottom:.25rem; }
      .summary-item span,.notes p { color:var(--muted); line-height:1.55; } .card + .card { margin-top:1rem; } table { width:100%; border-collapse:collapse; margin-top:1rem; }
      th,td { border:1px solid var(--line); padding:.75rem; text-align:left; vertical-align:top; font-size:.95rem; } th { background:#eef5f3; } .notes { display:grid; gap:.9rem; }
      a { color:var(--accent); } @media print { body { background:white; } main { width:100%; padding:0; } .page-head,.card { border-radius:0; box-shadow:none; } }
      @media (max-width:720px) { .head-row,.summary-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <main>
      <section class="page-head">
        <p class="eyebrow">PLBSE Submission Packet</p>
        <div class="head-row">
          <div><h1>${escapeHtml(teacher.profile.teacherName || teacher.name)}</h1><p class="eyebrow">${escapeHtml(teacher.profile.schoolName || teacher.school)}</p></div>
          <span class="badge">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="summary-grid">
          <div class="summary-item"><strong>License Area</strong><span>${escapeHtml(teacher.profile.licenseArea || 'Not added')}</span></div>
          <div class="summary-item"><strong>Renewal Cycle</strong><span>${escapeHtml(teacher.profile.renewalCycle || 'Not added')}</span></div>
          <div class="summary-item"><strong>Hours</strong><span>${escapeHtml(String(loggedHours))} of ${escapeHtml(String(teacher.profile.hoursTarget || 120))}</span></div>
        </div>
      </section>
      <section class="card">
        <p class="eyebrow">Status Timeline</p>
        <div class="summary-grid">
          <div class="summary-item"><strong>Review Requested</strong><span>${escapeHtml(formatDateTime(teacher.submission.requestedAt) || 'Not requested')}</span></div>
          <div class="summary-item"><strong>Last Reviewed</strong><span>${escapeHtml(formatDateTime(teacher.submission.reviewedAt) || 'Not reviewed')}</span></div>
          <div class="summary-item"><strong>PLBSE Submitted</strong><span>${escapeHtml(formatDateTime(teacher.submission.submittedToPlbseAt) || 'Not marked submitted')}</span></div>
        </div>
      </section>
      <section class="card">
        <p class="eyebrow">CEU Activities</p>
        <table><thead><tr><th>#</th><th>Activity</th><th>Provider</th><th>Date</th><th>Hours</th><th>Type</th><th>Evidence</th><th>Notes</th></tr></thead><tbody>${renderedActivities}</tbody></table>
      </section>
      <section class="card notes">
        <div><strong>Teacher Notes</strong><p>${escapeHtml(teacher.submission.teacherNotes || 'No teacher notes added.')}</p></div>
        <div><strong>Admin Notes</strong><p>${escapeHtml(teacher.submission.adminNotes || 'No admin notes added.')}</p></div>
        <div><strong>Reviewer</strong><p>${escapeHtml(teacher.submission.reviewerName || 'Not assigned')}</p></div>
      </section>
    </main>
  </body>
</html>`;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw createHttpError(400, 'Request body must be valid JSON.');
  }
}

function parseCookies(header) {
  return header.split(';').reduce((cookies, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) {
      return cookies;
    }
    cookies[key] = decodeURIComponent(rest.join('='));
    return cookies;
  }, {});
}

function setCookie(response, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  const existing = response.getHeader('Set-Cookie');
  const next = Array.isArray(existing) ? [...existing, parts.join('; ')] : [parts.join('; ')];
  response.setHeader('Set-Cookie', next);
}

function clearCookie(response, name) {
  setCookie(response, name, '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requireString(value, message) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createHttpError(400, message);
  }
  return value.trim();
}

function sanitizeText(value, maxLength = 255) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}

function normalizeHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw createHttpError(400, 'CEU hours must be greater than zero.');
  }
  return Math.round(hours * 10) / 10;
}

function normalizeHoursTarget(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 1) {
    return 120;
  }
  return Math.round(hours * 10) / 10;
}

function normalizeSubmissionStatus(value) {
  const status = sanitizeText(value, 80);
  if (!VALID_STATUSES.has(status)) {
    throw createHttpError(400, 'Submission status is not supported.');
  }
  return status;
}

function validateAdminCode(value) {
  if (typeof value !== 'string' || value.trim() !== ADMIN_CODE) {
    throw createHttpError(403, 'Admin review code is invalid.');
  }
}

function formatSubmissionStatus(status) {
  const labels = {
    draft: 'Draft Packet',
    pending_review: 'Pending Review',
    needs_changes: 'Needs Changes',
    approved: 'Approved',
    submitted_to_plbse: 'Submitted to PLBSE',
  };
  return labels[status] || 'Draft Packet';
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}
