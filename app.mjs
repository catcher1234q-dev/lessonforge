const defaultSubmission = {
  status: 'draft',
  teacherNotes: '',
  adminNotes: '',
  requestedAt: '',
  reviewedAt: '',
  submittedToPlbseAt: '',
  reviewerName: '',
};

const defaultState = {
  teacher: null,
  profile: {
    teacherName: '',
    schoolName: '',
    licenseArea: '',
    renewalCycle: '',
    hoursTarget: 120,
  },
  activities: [],
  submission: { ...defaultSubmission },
};

const defaultAdminState = {
  session: null,
  queue: [],
  auditLog: [],
  auditFilter: 'all',
  queueSearch: '',
  statusFilter: 'all',
  accountFilter: 'all',
  followUpFilter: 'all',
  selectedTeacherId: '',
};

const authForm = document.getElementById('auth-form');
const adminAuthForm = document.getElementById('admin-auth-form');
const profileForm = document.getElementById('profile-form');
const uploadForm = document.getElementById('upload-form');
const adminReviewForm = document.getElementById('admin-review-form');
const adminCreateTeacherForm = document.getElementById('admin-create-teacher-form');
const adminResetPasswordForm = document.getElementById('admin-reset-password-form');
const changePasswordForm = document.getElementById('change-password-form');
const portalContentEl = document.getElementById('portal-content');
const adminContentEl = document.getElementById('admin-content');
const statusBannerEl = document.getElementById('status-banner');
const activityListEl = document.getElementById('activity-list');
const emptyStateEl = document.getElementById('empty-state');
const activityTemplate = document.getElementById('activity-template');
const adminRowTemplate = document.getElementById('admin-row-template');
const checklistEl = document.getElementById('checklist');
const submissionSummaryEl = document.getElementById('submission-summary');
const submissionStatusCardEl = document.getElementById('submission-status-card');
const requestReviewButtonEl = document.getElementById('request-review-button');
const openPacketButtonEl = document.getElementById('open-packet-button');
const downloadSummaryEl = document.getElementById('download-summary');
const saveActivityButtonEl = document.getElementById('save-activity-button');
const logoutButtonEl = document.getElementById('logout-button');
const adminLogoutButtonEl = document.getElementById('admin-logout-button');
const adminQueueEl = document.getElementById('admin-queue');
const adminQueueSearchEl = document.getElementById('admin-queue-search');
const adminStatusFilterEl = document.getElementById('admin-status-filter');
const adminAccountFilterEl = document.getElementById('admin-account-filter');
const adminFollowUpFilterEl = document.getElementById('admin-followup-filter');
const exportQueueButtonEl = document.getElementById('export-queue-button');
const adminQueueSummaryEl = document.getElementById('admin-queue-summary');
const auditLogEl = document.getElementById('audit-log');
const auditFilterEl = document.getElementById('audit-filter');
const adminEmptyEl = document.getElementById('admin-empty');
const adminSummaryBadgeEl = document.getElementById('admin-summary-badge');
const saveReviewButtonEl = document.getElementById('save-review-button');
const adminOpenPacketButtonEl = document.getElementById('admin-open-packet-button');
const adminReminderTemplateEl = document.getElementById('admin-reminder-template');
const adminReminderMessageEl = document.getElementById('admin-reminder-message');
const generateReminderButtonEl = document.getElementById('generate-reminder-button');
const copyReminderButtonEl = document.getElementById('copy-reminder-button');
const emailReminderButtonEl = document.getElementById('email-reminder-button');
const printReminderButtonEl = document.getElementById('print-reminder-button');
const logReminderButtonEl = document.getElementById('log-reminder-button');
const adminReminderStatsEl = document.getElementById('admin-reminder-stats');
const adminReminderHistoryEl = document.getElementById('admin-reminder-history');
const createTeacherButtonEl = document.getElementById('create-teacher-button');
const resetPasswordButtonEl = document.getElementById('reset-password-button');
const changePasswordButtonEl = document.getElementById('change-password-button');
const toggleAccountButtonEl = document.getElementById('toggle-account-button');
const exportAuditButtonEl = document.getElementById('export-audit-button');
const adminResetTeacherEl = document.getElementById('admin-reset-teacher');
const adminResetPasswordEl = document.getElementById('admin-reset-password');
const adminSelectedTeacherEl = document.getElementById('admin-selected-teacher');
const adminStatusSelectEl = document.getElementById('admin-status-select');
const adminReviewNotesEl = document.getElementById('admin-review-notes');

const targetHoursEl = document.getElementById('target-hours');
const loggedHoursEl = document.getElementById('logged-hours');
const readyFilesEl = document.getElementById('ready-files');
const missingCountEl = document.getElementById('missing-count');
const progressPercentEl = document.getElementById('progress-percent');
const progressFillEl = document.getElementById('progress-fill');
const completionBadgeEl = document.getElementById('completion-badge');

let state = structuredClone(defaultState);
let adminState = structuredClone(defaultAdminState);
let profileSaveTimer = null;

bindEvents();
restoreSession();
restoreAdminSession();

function bindEvents() {
  authForm.addEventListener('submit', handleSignIn);
  adminAuthForm.addEventListener('submit', handleAdminSignIn);
  profileForm.addEventListener('input', handleProfileInput);
  uploadForm.addEventListener('submit', handleUpload);
  activityListEl.addEventListener('click', handleActivityActions);
  adminQueueEl.addEventListener('click', handleAdminQueueActions);
  downloadSummaryEl.addEventListener('click', downloadSummary);
  requestReviewButtonEl.addEventListener('click', handleRequestReview);
  logoutButtonEl.addEventListener('click', handleLogout);
  adminLogoutButtonEl.addEventListener('click', handleAdminLogout);
  adminReviewForm.addEventListener('submit', handleAdminReviewSubmit);
  generateReminderButtonEl.addEventListener('click', handleGenerateReminder);
  adminReminderTemplateEl.addEventListener('change', handleGenerateReminder);
  copyReminderButtonEl.addEventListener('click', handleCopyReminder);
  emailReminderButtonEl.addEventListener('click', handleEmailReminder);
  printReminderButtonEl.addEventListener('click', handlePrintReminder);
  logReminderButtonEl.addEventListener('click', handleLogReminder);
  adminCreateTeacherForm.addEventListener('submit', handleAdminCreateTeacher);
  adminResetPasswordForm.addEventListener('submit', handleAdminResetPassword);
  changePasswordForm.addEventListener('submit', handleChangePassword);
  toggleAccountButtonEl.addEventListener('click', handleToggleTeacherStatus);
  adminQueueSearchEl.addEventListener('input', handleAdminQueueFilterChange);
  adminStatusFilterEl.addEventListener('change', handleAdminQueueFilterChange);
  adminAccountFilterEl.addEventListener('change', handleAdminQueueFilterChange);
  adminFollowUpFilterEl.addEventListener('change', handleAdminQueueFilterChange);
  auditFilterEl.addEventListener('change', handleAuditFilterChange);
  exportAuditButtonEl.addEventListener('click', exportAuditLog);
  exportQueueButtonEl.addEventListener('click', exportQueue);
}

async function restoreSession() {
  try {
    const payload = await api('/api/session/me');
    if (!payload.teacher) {
      clearTeacherWorkspace();
      setStatus(payload.message || 'Sign in to create or reopen a teacher workspace.', 'info');
      return;
    }

    applyPortalPayload(payload);
    setStatus(`Welcome back, ${state.profile.teacherName || 'teacher'}.`, 'success');
  } catch {
    setStatus('Sign in to create or reopen a teacher workspace.', 'info');
  }
}

async function restoreAdminSession() {
  try {
    const payload = await api('/api/admin/session');
    if (!payload.session) {
      return;
    }

    adminState.session = payload.session;
    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || [];
    adminState.selectedTeacherId = payload.queue[0]?.teacherId || '';
    renderAdmin();
  } catch {
    // Ignore missing admin session on load.
  }
}

async function handleSignIn(event) {
  event.preventDefault();

  const formData = new FormData(authForm);
  const name = String(formData.get('teacherName')).trim();
  const email = String(formData.get('email')).trim().toLowerCase();
  const school = String(formData.get('school')).trim();
  const password = String(formData.get('password')).trim();

  setStatus('Opening teacher workspace...', 'info');

  try {
    const payload = await api('/api/session', {
      method: 'POST',
      body: JSON.stringify({ name, email, school, password }),
    });

    applyPortalPayload(payload);
    profileForm.teacherName.focus();
    setStatus(`Workspace ready for ${payload.teacher.name}.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function handleAdminSignIn(event) {
  event.preventDefault();

  const formData = new FormData(adminAuthForm);
  const adminName = String(formData.get('adminName')).trim();
  const code = String(formData.get('code')).trim();

  setStatus('Opening admin review workspace...', 'info');

  try {
    const payload = await api('/api/admin/session', {
      method: 'POST',
      body: JSON.stringify({ adminName, code }),
    });

    adminState.session = payload.session;
    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || [];
    adminState.selectedTeacherId = payload.queue[0]?.teacherId || '';
    renderAdmin();
    setStatus(`Admin workspace ready for ${payload.session.name}.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function handleProfileInput() {
  if (!state.teacher) {
    return;
  }

  state.profile = readProfileForm();
  renderTeacher();

  window.clearTimeout(profileSaveTimer);
  profileSaveTimer = window.setTimeout(async () => {
    try {
      const payload = await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ profile: state.profile }),
      });

      applyPortalPayload(payload, { preserveStatus: true });
      setStatus('Profile saved.', 'success', 1800);
      await refreshAdminQueue({ silent: true });
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }, 350);
}

async function handleUpload(event) {
  event.preventDefault();

  if (!state.teacher) {
    setStatus('Sign in before uploading CEU files.', 'error');
    return;
  }

  const formData = new FormData(uploadForm);
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    setStatus('Choose a certificate or transcript file before saving.', 'error');
    return;
  }

  saveActivityButtonEl.disabled = true;
  saveActivityButtonEl.textContent = 'Saving...';
  setStatus('Uploading CEU evidence to the server...', 'info');

  try {
    const fileDataUrl = await fileToDataUrl(file);
    const payload = await api('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        activity: {
          title: String(formData.get('title')).trim(),
          provider: String(formData.get('provider')).trim(),
          completedOn: String(formData.get('completedOn')),
          hours: Number(formData.get('hours')) || 0,
          type: String(formData.get('type')).trim(),
          notes: String(formData.get('notes')).trim(),
          file: {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: fileDataUrl,
          },
        },
      }),
    });

    applyPortalPayload(payload);
    uploadForm.reset();
    setStatus('CEU activity saved and file uploaded.', 'success');
    await refreshAdminQueue({ silent: true });
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    saveActivityButtonEl.disabled = false;
    saveActivityButtonEl.textContent = 'Save Activity';
  }
}

async function handleActivityActions(event) {
  const deleteButton = event.target.closest('.delete-activity');
  if (!deleteButton || !state.teacher) {
    return;
  }

  const card = deleteButton.closest('.activity-card');
  const id = card?.dataset.activityId;
  if (!id) {
    return;
  }

  setStatus('Removing CEU activity...', 'info');

  try {
    const payload = await api(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    applyPortalPayload(payload);
    setStatus('Activity removed.', 'success');
    await refreshAdminQueue({ silent: true });
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function handleRequestReview() {
  if (!state.teacher) {
    return;
  }

  if (countMissingItems() > 0) {
    setStatus('Finish the checklist before requesting admin review.', 'error');
    return;
  }

  requestReviewButtonEl.disabled = true;
  setStatus('Sending packet to the admin review queue...', 'info');

  try {
    const payload = await api('/api/submission/request-review', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    applyPortalPayload(payload);
    setStatus('Packet moved to admin review.', 'success');
    await refreshAdminQueue({ silent: true });
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    requestReviewButtonEl.disabled = false;
  }
}

async function handleLogout() {
  try {
    await api('/api/session/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } catch {
    // Ignore logout errors and clear local view anyway.
  }

  clearTeacherWorkspace();
  setStatus('You have been signed out of the teacher portal.', 'info');
}

async function handleAdminLogout() {
  try {
    await api('/api/admin/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } catch {
    // Ignore logout errors and clear local view anyway.
  }

  adminState = structuredClone(defaultAdminState);
  adminAuthForm.reset();
  adminCreateTeacherForm.reset();
  adminResetPasswordForm.reset();
  adminContentEl.hidden = true;
  renderAdmin();
  setStatus('You have been signed out of the admin review workspace.', 'info');
}

function handleAdminQueueActions(event) {
  const button = event.target.closest('.admin-select-button');
  if (!button) {
    return;
  }

  const row = button.closest('.admin-row');
  const teacherId = row?.dataset.teacherId;
  if (!teacherId) {
    return;
  }

  adminState.selectedTeacherId = teacherId;
  renderAdmin();
}

async function handleAdminReviewSubmit(event) {
  event.preventDefault();

  if (!adminState.session || !adminState.selectedTeacherId) {
    return;
  }

  saveReviewButtonEl.disabled = true;
  saveReviewButtonEl.textContent = 'Saving...';
  setStatus('Saving admin review update...', 'info');

  try {
    const payload = await api(`/api/admin/submissions/${encodeURIComponent(adminState.selectedTeacherId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: adminStatusSelectEl.value,
        reviewNotes: adminReviewNotesEl.value.trim(),
      }),
    });

    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || adminState.auditLog;
    renderAdmin();
    setStatus('Review update saved.', 'success');

    if (state.teacher?.id === adminState.selectedTeacherId) {
      const teacherPayload = await api('/api/session/me');
      if (teacherPayload.teacher) {
        applyPortalPayload(teacherPayload, { preserveStatus: true });
      }
    }
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    saveReviewButtonEl.disabled = false;
    saveReviewButtonEl.textContent = 'Save Review Update';
  }
}

async function handleAdminCreateTeacher(event) {
  event.preventDefault();

  if (!adminState.session) {
    return;
  }

  const formData = new FormData(adminCreateTeacherForm);
  createTeacherButtonEl.disabled = true;
  createTeacherButtonEl.textContent = 'Creating...';
  setStatus('Creating teacher account...', 'info');

  try {
    const payload = await api('/api/admin/teachers', {
      method: 'POST',
      body: JSON.stringify({
        teacherName: String(formData.get('teacherName')).trim(),
        email: String(formData.get('email')).trim().toLowerCase(),
        school: String(formData.get('school')).trim(),
        password: String(formData.get('password')).trim(),
      }),
    });

    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || adminState.auditLog;
    adminState.selectedTeacherId = payload.teacher.id;
    adminCreateTeacherForm.reset();
    renderAdmin();
    setStatus(`Teacher account created for ${payload.teacher.name}.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    createTeacherButtonEl.disabled = false;
    createTeacherButtonEl.textContent = 'Create Teacher Account';
  }
}

async function handleAdminResetPassword(event) {
  event.preventDefault();

  if (!adminState.session || !adminState.selectedTeacherId) {
    setStatus('Select a teacher packet before resetting a password.', 'error');
    return;
  }

  const password = adminResetPasswordEl.value.trim();
  if (!password) {
    setStatus('Enter a new password before saving.', 'error');
    return;
  }

  resetPasswordButtonEl.disabled = true;
  resetPasswordButtonEl.textContent = 'Resetting...';
  setStatus('Resetting teacher password...', 'info');

  try {
    const payload = await api(`/api/admin/teachers/${encodeURIComponent(adminState.selectedTeacherId)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    adminState.queue = payload.queue;
    adminResetPasswordForm.reset();
    renderAdmin();
    setStatus('Teacher password reset.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    resetPasswordButtonEl.disabled = false;
    resetPasswordButtonEl.textContent = 'Reset Password';
  }
}

async function handleChangePassword(event) {
  event.preventDefault();

  if (!state.teacher) {
    return;
  }

  const formData = new FormData(changePasswordForm);
  const currentPassword = String(formData.get('currentPassword')).trim();
  const newPassword = String(formData.get('newPassword')).trim();

  changePasswordButtonEl.disabled = true;
  changePasswordButtonEl.textContent = 'Updating...';
  setStatus('Updating your password...', 'info');

  try {
    await api('/api/session/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    changePasswordForm.reset();
    setStatus('Password updated.', 'success');
    await refreshAdminQueue({ silent: true });
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    changePasswordButtonEl.disabled = false;
    changePasswordButtonEl.textContent = 'Update Password';
  }
}

async function handleToggleTeacherStatus() {
  if (!adminState.session || !adminState.selectedTeacherId) {
    setStatus('Select a teacher before changing account status.', 'error');
    return;
  }

  const selected = adminState.queue.find((item) => item.teacherId === adminState.selectedTeacherId);
  if (!selected) {
    return;
  }

  const nextActive = !selected.isActive;
  toggleAccountButtonEl.disabled = true;
  setStatus(`${nextActive ? 'Reactivating' : 'Deactivating'} teacher account...`, 'info');

  try {
    const payload = await api(`/api/admin/teachers/${encodeURIComponent(selected.teacherId)}/status`, {
      method: 'POST',
      body: JSON.stringify({ isActive: nextActive }),
    });

    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || adminState.auditLog;
    renderAdmin();
    setStatus(`Teacher account ${nextActive ? 'reactivated' : 'deactivated'}.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    toggleAccountButtonEl.disabled = false;
  }
}

function handleGenerateReminder() {
  if (!adminState.session || !adminState.selectedTeacherId) {
    setStatus('Select a teacher before generating a reminder.', 'error');
    return;
  }

  const selected = adminState.queue.find((item) => item.teacherId === adminState.selectedTeacherId);
  if (!selected) {
    return;
  }

  adminReminderMessageEl.value = buildReminderMessage(selected, adminReminderTemplateEl.value);
  emailReminderButtonEl.href = buildReminderMailto(selected, adminReminderMessageEl.value);
  renderReminderStats(selected);
  setStatus('Reminder message prepared.', 'success', 1200);
}

async function handleCopyReminder() {
  const message = adminReminderMessageEl.value.trim();
  if (!message) {
    setStatus('Generate or write a reminder before copying.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(message);
    setStatus('Reminder copied to clipboard.', 'success', 1200);
  } catch {
    setStatus('Clipboard copy was unavailable. You can still copy the reminder manually.', 'info');
  }
}

function handleEmailReminder(event) {
  if (!adminState.session || !adminState.selectedTeacherId) {
    event.preventDefault();
    setStatus('Select a teacher before opening an email draft.', 'error');
    return;
  }

  const selected = adminState.queue.find((item) => item.teacherId === adminState.selectedTeacherId);
  const message = adminReminderMessageEl.value.trim();
  if (!selected || !message) {
    event.preventDefault();
    setStatus('Generate or write a reminder before opening an email draft.', 'error');
    return;
  }

  emailReminderButtonEl.href = buildReminderMailto(selected, message);
}

function handlePrintReminder() {
  if (!adminState.session || !adminState.selectedTeacherId) {
    setStatus('Select a teacher before printing a reminder letter.', 'error');
    return;
  }

  const selected = adminState.queue.find((item) => item.teacherId === adminState.selectedTeacherId);
  const message = adminReminderMessageEl.value.trim();
  if (!selected || !message) {
    setStatus('Generate or write a reminder before printing.', 'error');
    return;
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    setStatus('Pop-up blocking prevented the print letter view from opening.', 'error');
    return;
  }

  printWindow.document.write(buildReminderLetterHtml(selected, message));
  printWindow.document.close();
  printWindow.focus();
}

async function handleLogReminder() {
  if (!adminState.session || !adminState.selectedTeacherId) {
    setStatus('Select a teacher before logging a reminder.', 'error');
    return;
  }

  const message = adminReminderMessageEl.value.trim();
  if (!message) {
    setStatus('Generate or write a reminder before logging it.', 'error');
    return;
  }

  logReminderButtonEl.disabled = true;
  logReminderButtonEl.textContent = 'Logging...';
  setStatus('Logging reminder in the audit trail...', 'info');

  try {
    const payload = await api(`/api/admin/teachers/${encodeURIComponent(adminState.selectedTeacherId)}/reminder`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });

    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || adminState.auditLog;
    renderAdmin();
    setStatus('Reminder logged.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    logReminderButtonEl.disabled = false;
    logReminderButtonEl.textContent = 'Log Reminder';
  }
}

function handleAuditFilterChange() {
  adminState.auditFilter = auditFilterEl.value;
  renderAdmin();
}

function handleAdminQueueFilterChange() {
  adminState.queueSearch = adminQueueSearchEl.value.trim().toLowerCase();
  adminState.statusFilter = adminStatusFilterEl.value;
  adminState.accountFilter = adminAccountFilterEl.value;
  adminState.followUpFilter = adminFollowUpFilterEl.value;
  renderAdmin();
}

function exportAuditLog() {
  const items = getFilteredAuditItems();
  const lines = items.map((item) =>
    [
      `Time: ${formatDateTime(item.createdAt)}`,
      `Action: ${item.action}`,
      `Actor: ${item.actor}`,
      `Subject: ${item.subject || 'None'}`,
      `Details: ${item.details || ''}`,
      '',
    ].join('\n')
  ).join('\n');

  const blob = new Blob([lines || 'No audit events available.'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-log.txt';
  link.click();
  URL.revokeObjectURL(url);
}

function clearTeacherWorkspace() {
  state = structuredClone(defaultState);
  authForm.reset();
  profileForm.reset();
  uploadForm.reset();
  changePasswordForm.reset();
  portalContentEl.hidden = true;
  renderTeacher();
}

function applyPortalPayload(payload, options = {}) {
  state.teacher = payload.teacher;
  state.profile = {
    ...defaultState.profile,
    ...(payload.profile ?? {}),
  };
  state.activities = Array.isArray(payload.activities) ? payload.activities : [];
  state.submission = {
    ...defaultSubmission,
    ...(payload.submission ?? {}),
  };

  hydrateAuthForm();
  hydrateProfileForm();
  portalContentEl.hidden = false;
  renderTeacher();

  if (!options.preserveStatus) {
    setStatus('Portal synced with the server.', 'success', 1200);
  }
}

function hydrateAuthForm() {
  if (!state.teacher) {
    return;
  }

  authForm.teacherName.value = state.teacher.name || '';
  authForm.email.value = state.teacher.email || '';
  authForm.school.value = state.teacher.school || '';
}

function hydrateProfileForm() {
  profileForm.teacherName.value = state.profile.teacherName;
  profileForm.schoolName.value = state.profile.schoolName;
  profileForm.licenseArea.value = state.profile.licenseArea;
  profileForm.renewalCycle.value = state.profile.renewalCycle;
  profileForm.hoursTarget.value = state.profile.hoursTarget;
}

function readProfileForm() {
  return {
    teacherName: profileForm.teacherName.value.trim(),
    schoolName: profileForm.schoolName.value.trim(),
    licenseArea: profileForm.licenseArea.value.trim(),
    renewalCycle: profileForm.renewalCycle.value.trim(),
    hoursTarget: Number(profileForm.hoursTarget.value) || defaultState.profile.hoursTarget,
  };
}

async function refreshAdminQueue(options = {}) {
  if (!adminState.session) {
    return;
  }

  try {
    const payload = await api('/api/admin/overview');
    adminState.queue = payload.queue;
    adminState.auditLog = payload.auditLog || [];

    if (!adminState.selectedTeacherId || !adminState.queue.some((item) => item.teacherId === adminState.selectedTeacherId)) {
      adminState.selectedTeacherId = adminState.queue[0]?.teacherId || '';
    }

    renderAdmin();

    if (!options.silent) {
      setStatus('Admin queue refreshed.', 'success', 1200);
    }
  } catch (error) {
    if (!options.silent) {
      setStatus(error.message, 'error');
    }
  }
}

function renderTeacher() {
  renderStats();
  renderChecklist();
  renderActivities();
  renderSubmissionStatus();
  renderSubmissionSummary();
  renderTeacherPacketLink();
}

function renderAdmin() {
  adminContentEl.hidden = !adminState.session;
  adminQueueEl.innerHTML = '';
  auditLogEl.innerHTML = '';
  const filteredQueue = getFilteredQueueItems();
  if (!filteredQueue.some((item) => item.teacherId === adminState.selectedTeacherId)) {
    adminState.selectedTeacherId = filteredQueue[0]?.teacherId || '';
  }

  adminSummaryBadgeEl.textContent = `${filteredQueue.length} of ${adminState.queue.length} packet${adminState.queue.length === 1 ? '' : 's'}`;
  adminQueueSearchEl.value = adminState.queueSearch;
  adminStatusFilterEl.value = adminState.statusFilter;
  adminAccountFilterEl.value = adminState.accountFilter;
  adminFollowUpFilterEl.value = adminState.followUpFilter;
  adminQueueSummaryEl.innerHTML = buildQueueSummary(filteredQueue);

  filteredQueue.forEach((item) => {
    const fragment = adminRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.admin-row');
    const title = fragment.querySelector('.admin-row-title');
    const meta = fragment.querySelector('.admin-row-meta');
    const status = fragment.querySelector('.admin-row-status');
    const summary = fragment.querySelector('.admin-row-summary');
    const followUp = getQueueFollowUp(item);

    row.dataset.teacherId = item.teacherId;
    row.classList.toggle('is-selected', item.teacherId === adminState.selectedTeacherId);
    title.textContent = item.teacherName;
    meta.textContent = [
      item.email || 'Email missing',
      item.schoolName || 'School missing',
      item.isActive ? 'Active' : 'Inactive',
      `${formatHours(item.loggedHours)} of ${formatHours(item.targetHours)} hrs`,
    ].join(' • ');
    status.textContent = formatSubmissionStatus(item.submission.status);
    status.dataset.status = item.submission.status;
    summary.textContent = [followUp.label, item.submission.adminNotes || item.submission.teacherNotes || 'No review notes yet.'].join(' • ');

    adminQueueEl.appendChild(fragment);
  });

  if (filteredQueue.length === 0) {
    adminQueueEl.innerHTML = '<div class="empty-state">No teacher packets match the current search and filters.</div>';
  }

  const selected = filteredQueue.find((item) => item.teacherId === adminState.selectedTeacherId);
  adminEmptyEl.hidden = Boolean(selected);
  adminReviewForm.hidden = !selected;

  if (selected) {
    adminSelectedTeacherEl.value = `${selected.teacherName} (${selected.schoolName || 'School missing'})`;
    adminResetTeacherEl.value = `${selected.teacherName} (${selected.email || 'Email missing'})`;
    adminStatusSelectEl.value = selected.submission.status === 'draft' ? 'pending_review' : selected.submission.status;
    adminReviewNotesEl.value = selected.submission.adminNotes || '';
    adminReminderMessageEl.value = buildReminderMessage(selected, adminReminderTemplateEl.value);
    emailReminderButtonEl.href = buildReminderMailto(selected, adminReminderMessageEl.value);
    emailReminderButtonEl.classList.remove('button-disabled');
    emailReminderButtonEl.removeAttribute('aria-disabled');
    adminOpenPacketButtonEl.href = buildPacketUrl(selected.teacherId);
    adminOpenPacketButtonEl.classList.remove('button-disabled');
    adminOpenPacketButtonEl.removeAttribute('aria-disabled');
    toggleAccountButtonEl.textContent = selected.isActive ? 'Deactivate Account' : 'Reactivate Account';
    renderReminderStats(selected);
    renderReminderHistory(selected.teacherId);
  } else {
    adminSelectedTeacherEl.value = '';
    adminResetTeacherEl.value = '';
    adminReviewNotesEl.value = '';
    adminReminderTemplateEl.value = 'follow_up';
    adminReminderMessageEl.value = '';
    emailReminderButtonEl.removeAttribute('href');
    emailReminderButtonEl.setAttribute('aria-disabled', 'true');
    emailReminderButtonEl.classList.add('button-disabled');
    adminOpenPacketButtonEl.removeAttribute('href');
    adminOpenPacketButtonEl.setAttribute('aria-disabled', 'true');
    adminOpenPacketButtonEl.classList.add('button-disabled');
    toggleAccountButtonEl.textContent = 'Deactivate Account';
    adminReminderStatsEl.innerHTML = '<div class="empty-state">Select a teacher to view reminder stats.</div>';
    adminReminderHistoryEl.innerHTML = '<div class="empty-state">Select a teacher to view reminder history.</div>';
  }

  auditFilterEl.value = adminState.auditFilter;
  const auditItems = getFilteredAuditItems();
  if (auditItems.length === 0) {
    auditLogEl.innerHTML = '<div class="empty-state">No audit events have been recorded yet.</div>';
    return;
  }

  auditItems.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'audit-row';
    row.innerHTML = `
      <strong>${escapeHtml(item.action)}</strong>
      <p>${escapeHtml(item.actor)} • ${escapeHtml(item.subject || 'No subject')}</p>
      <p>${escapeHtml(formatDateTime(item.createdAt) || '')}</p>
      <p>${escapeHtml(item.details || '')}</p>
    `;
    auditLogEl.appendChild(row);
  });
}

function getFilteredQueueItems() {
  const search = adminState.queueSearch;
  return adminState.queue.filter((item) => {
    if (adminState.statusFilter !== 'all' && item.submission.status !== adminState.statusFilter) {
      return false;
    }

    if (adminState.accountFilter === 'active' && !item.isActive) {
      return false;
    }

    if (adminState.accountFilter === 'inactive' && item.isActive) {
      return false;
    }

    const followUp = getQueueFollowUp(item);
    if (adminState.followUpFilter === 'action_needed' && !followUp.needsAction) {
      return false;
    }

    if (adminState.followUpFilter === 'clear' && followUp.needsAction) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      item.teacherName,
      item.email,
      item.schoolName,
      item.licenseArea,
      item.renewalCycle,
      formatSubmissionStatus(item.submission.status),
      getQueueFollowUp(item).label,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
}

function buildQueueSummary(items) {
  if (items.length === 0) {
    return `
      <div class="summary-group">
        <span class="summary-label">Queue Results</span>
        <strong>No matching teacher packets</strong>
      </div>
    `;
  }

  const pendingCount = items.filter((item) => item.submission.status === 'pending_review').length;
  const needsChangesCount = items.filter((item) => item.submission.status === 'needs_changes').length;
  const inactiveCount = items.filter((item) => !item.isActive).length;
  const actionNeededCount = items.filter((item) => getQueueFollowUp(item).needsAction).length;

  return `
    <div class="summary-group">
      <span class="summary-label">Visible Packets</span>
      <strong>${items.length}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Pending Review</span>
      <strong>${pendingCount}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Needs Changes</span>
      <strong>${needsChangesCount}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Inactive Accounts</span>
      <strong>${inactiveCount}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Needs Follow-Up</span>
      <strong>${actionNeededCount}</strong>
    </div>
  `;
}

function getQueueFollowUp(item) {
  const now = Date.now();
  const requestedAge = daysSince(item.submission.requestedAt, now);
  const reviewedAge = daysSince(item.submission.reviewedAt, now);
  const createdAge = daysSince(item.createdAt, now);
  const lastLoginAge = daysSince(item.lastLoginAt, now);
  const lastReminderAge = daysSince(item.lastReminderAt, now);

  if (!item.isActive) {
    return { needsAction: false, label: 'Account inactive' };
  }

  if (item.submission.status === 'pending_review' && requestedAge >= 7) {
    return { needsAction: true, label: `Review overdue by ${requestedAge} day${requestedAge === 1 ? '' : 's'}` };
  }

  if (item.submission.status === 'needs_changes' && reviewedAge >= 14) {
    return { needsAction: true, label: `Waiting on teacher for ${reviewedAge} day${reviewedAge === 1 ? '' : 's'}` };
  }

  if (item.submission.status === 'draft' && item.activityCount === 0 && createdAge >= 14) {
    return { needsAction: true, label: `Not started after ${createdAge} day${createdAge === 1 ? '' : 's'}` };
  }

  if (item.submission.status === 'draft' && item.activityCount > 0 && lastLoginAge >= 21) {
    return { needsAction: true, label: `No recent teacher activity for ${lastLoginAge} day${lastLoginAge === 1 ? '' : 's'}` };
  }

  if (item.submission.status === 'needs_changes' && lastReminderAge >= 10) {
    return { needsAction: true, label: `Reminder stale for ${lastReminderAge} day${lastReminderAge === 1 ? '' : 's'}` };
  }

  if (item.submission.status === 'approved') {
    return { needsAction: false, label: 'Approved and ready' };
  }

  if (item.submission.status === 'submitted_to_plbse') {
    return { needsAction: false, label: 'Submitted to PLBSE' };
  }

  return { needsAction: false, label: 'No immediate follow-up' };
}

function buildReminderMessage(item, template = 'follow_up') {
  const followUp = getQueueFollowUp(item);
  const greetingName = item.teacherName || 'Teacher';
  const statusLabel = formatSubmissionStatus(item.submission.status);
  const missingHours = Math.max(0, (Number(item.targetHours) || 0) - (Number(item.loggedHours) || 0));
  const detailLine = getReminderTemplateCopy(item, template);

  const hoursLine = item.submission.status === 'draft' && missingHours > 0
    ? `You currently have ${formatHours(item.loggedHours)} of ${formatHours(item.targetHours)} hours logged, so ${formatHours(missingHours)} more hour${missingHours === 1 ? '' : 's'} may still be needed.`
    : `Current packet status: ${statusLabel}.`;

  return [
    `Hello ${greetingName},`,
    '',
    'This is a reminder from the PLBSE CEU portal team.',
    detailLine,
    hoursLine,
    `Follow-up note: ${followUp.label}.`,
    '',
    'Please sign in to your portal, review your CEU records, and upload or update any missing items.',
    '',
    'Thank you,',
    adminState.session?.name || 'PLBSE Coordinator',
  ].join('\n');
}

function getReminderTemplateCopy(item, template) {
  const templates = {
    follow_up: 'This is a reminder from the PLBSE CEU portal team to keep your packet moving.',
    needs_changes: 'Please review the admin notes in your packet and update the requested items before sending it back for review.',
    draft_incomplete: 'Your CEU packet is still in draft and needs a little more work before it can move to review.',
    review_overdue: 'Your packet is still in the review line, and we are sending an update so you know it is still being tracked.',
  };

  if (template === 'needs_changes' && item.submission.status !== 'needs_changes') {
    return templates.follow_up;
  }

  if (template === 'draft_incomplete' && item.submission.status !== 'draft') {
    return templates.follow_up;
  }

  if (template === 'review_overdue' && item.submission.status !== 'pending_review') {
    return templates.follow_up;
  }

  return templates[template] || templates.follow_up;
}

function buildReminderMailto(item, message) {
  const subject = `PLBSE CEU Portal Reminder for ${item.teacherName}`;
  return `mailto:${encodeURIComponent(item.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

function getReminderHistoryItems(teacherId) {
  return (Array.isArray(adminState.auditLog) ? adminState.auditLog : [])
    .filter((item) => item.subject === teacherId && item.action === 'teacher_reminder_logged')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function renderReminderHistory(teacherId) {
  const items = getReminderHistoryItems(teacherId);
  if (items.length === 0) {
    adminReminderHistoryEl.innerHTML = '<div class="empty-state">No reminders have been logged for this teacher yet.</div>';
    return;
  }

  adminReminderHistoryEl.innerHTML = '';
  items.slice(0, 5).forEach((item) => {
    const row = document.createElement('article');
    row.className = 'audit-row';
    row.innerHTML = `
      <strong>${escapeHtml(formatDateTime(item.createdAt) || '')}</strong>
      <p>${escapeHtml(item.actor)}</p>
      <p>${escapeHtml(item.details || '')}</p>
    `;
    adminReminderHistoryEl.appendChild(row);
  });
}

function renderReminderStats(item) {
  const historyItems = getReminderHistoryItems(item.teacherId);
  const totalReminders = historyItems.length;
  const lastReminderAt = historyItems[0]?.createdAt || item.lastReminderAt;
  const followUp = getQueueFollowUp(item);

  adminReminderStatsEl.innerHTML = `
    <div class="summary-group">
      <span class="summary-label">Total Reminders</span>
      <strong>${totalReminders}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Last Reminder</span>
      <strong>${escapeHtml(formatDateTime(lastReminderAt) || 'Not logged')}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Current Template</span>
      <strong>${escapeHtml(getReminderTemplateLabel(adminReminderTemplateEl.value))}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Follow-Up Status</span>
      <strong>${escapeHtml(followUp.label)}</strong>
    </div>
  `;
}

function getReminderTemplateLabel(value) {
  const labels = {
    follow_up: 'Standard Follow-Up',
    needs_changes: 'Needs Changes Notice',
    draft_incomplete: 'Incomplete Draft Reminder',
    review_overdue: 'Review Delay Update',
  };

  return labels[value] || 'Standard Follow-Up';
}

function buildReminderLetterHtml(item, message) {
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reminder Letter - ${escapeHtml(item.teacherName)}</title>
    <style>
      :root { color-scheme: light; --ink:#20303d; --muted:#5d6b76; --line:#d7ddd8; --bg:#f7f3ec; --card:#ffffff; --accent:#0f766e; }
      * { box-sizing:border-box; } body { margin:0; font-family:"Avenir Next","Segoe UI",sans-serif; color:var(--ink); background:var(--bg); }
      main { width:min(820px, calc(100vw - 2rem)); margin:0 auto; padding:2rem 0 3rem; }
      .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:1.5rem; }
      .eyebrow { margin:0 0 .35rem; font-size:.78rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); font-weight:700; }
      h1 { margin:0 0 1rem; } p { line-height:1.65; margin:.4rem 0 0; } .meta { margin-top:1rem; color:var(--muted); }
      @media print { body { background:white; } main { width:100%; padding:0; } .card { border-radius:0; box-shadow:none; } }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <p class="eyebrow">PLBSE Teacher Reminder</p>
        <h1>${escapeHtml(item.teacherName)}</h1>
        <p>${escapeHtml(item.schoolName || 'School not added')}</p>
        <p class="meta">${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        <p>${safeMessage}</p>
      </section>
    </main>
  </body>
</html>`;
}

function daysSince(value, now = Date.now()) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - time) / (1000 * 60 * 60 * 24)));
}

function exportQueue() {
  const rows = getFilteredQueueItems();
  const header = [
    'Teacher Name',
    'Email',
    'School',
    'License Area',
    'Renewal Cycle',
    'Status',
    'Account State',
    'Follow-Up',
    'Logged Hours',
    'Target Hours',
    'Activities',
    'Files',
    'Created At',
    'Last Login',
    'Last Reminder',
    'Review Requested',
    'Last Reviewed',
  ];

  const lines = [
    header.join(','),
    ...rows.map((item) => {
      const followUp = getQueueFollowUp(item);
      return [
        item.teacherName,
        item.email,
        item.schoolName,
        item.licenseArea,
        item.renewalCycle,
        formatSubmissionStatus(item.submission.status),
        item.isActive ? 'Active' : 'Inactive',
        followUp.label,
        formatHours(item.loggedHours),
        formatHours(item.targetHours),
        item.activityCount,
        item.fileCount,
        formatDateTime(item.createdAt),
        formatDateTime(item.lastLoginAt),
        formatDateTime(item.lastReminderAt),
        formatDateTime(item.submission.requestedAt),
        formatDateTime(item.submission.reviewedAt),
      ].map(escapeCsv).join(',');
    }),
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'teacher-review-queue.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function getFilteredAuditItems() {
  const items = Array.isArray(adminState.auditLog) ? adminState.auditLog : [];
  const filter = adminState.auditFilter || 'all';
  if (filter === 'all') {
    return items;
  }

  const matcher = {
    account: ['teacher_account_created', 'teacher_account_deactivated', 'teacher_account_reactivated', 'teacher_login'],
    password: ['teacher_password_changed', 'teacher_password_reset'],
    submission: ['submission_status_updated'],
    reminder: ['teacher_reminder_logged'],
  };

  return items.filter((item) => matcher[filter]?.includes(item.action));
}

function renderStats() {
  const targetHours = Number(state.profile.hoursTarget) || defaultState.profile.hoursTarget;
  const loggedHours = sumLoggedHours();
  const readyFiles = state.activities.filter((activity) => activity.fileName).length;
  const missingCount = countMissingItems();
  const progress = Math.min(100, Math.round((loggedHours / targetHours) * 100)) || 0;
  const complete = progress >= 100 && missingCount === 0 && readyFiles > 0;

  targetHoursEl.textContent = String(targetHours);
  loggedHoursEl.textContent = formatHours(loggedHours);
  readyFilesEl.textContent = String(readyFiles);
  missingCountEl.textContent = String(missingCount);
  progressPercentEl.textContent = `${progress}%`;
  progressFillEl.style.width = `${progress}%`;
  completionBadgeEl.textContent = complete ? 'Ready to submit' : 'In progress';
}

function renderChecklist() {
  const items = buildChecklistItems();
  checklistEl.innerHTML = '';

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = `checklist-item ${item.done ? 'is-done' : 'is-pending'}`;
    row.innerHTML = `
      <strong>${item.done ? 'Complete' : 'Needs attention'}</strong>
      <p>${escapeHtml(item.label)}</p>
    `;
    checklistEl.appendChild(row);
  });
}

function renderActivities() {
  activityListEl.innerHTML = '';
  emptyStateEl.hidden = state.activities.length > 0;

  state.activities.forEach((activity) => {
    const fragment = activityTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.activity-card');
    const title = fragment.querySelector('.activity-title');
    const provider = fragment.querySelector('.activity-provider');
    const hours = fragment.querySelector('.activity-hours');
    const meta = fragment.querySelector('.activity-meta');
    const notes = fragment.querySelector('.activity-notes');
    const openFile = fragment.querySelector('.open-file');

    card.dataset.activityId = activity.id;
    title.textContent = activity.title;
    provider.textContent = activity.provider;
    hours.textContent = `${formatHours(activity.hours)} hrs`;
    meta.textContent = [
      activity.type,
      formatDate(activity.completedOn),
      activity.fileName || 'No file attached',
    ].join(' • ');
    notes.textContent = activity.notes || 'No additional submission notes.';

    if (activity.fileUrl) {
      openFile.href = activity.fileUrl;
      openFile.textContent = 'View File';
      openFile.classList.remove('button-disabled');
      openFile.removeAttribute('aria-disabled');
    } else {
      openFile.removeAttribute('href');
      openFile.textContent = 'Missing File';
      openFile.setAttribute('aria-disabled', 'true');
      openFile.classList.add('button-disabled');
    }

    activityListEl.appendChild(fragment);
  });
}

function renderSubmissionStatus() {
  const status = state.submission.status || 'draft';
  const details = [];

  if (state.submission.requestedAt) {
    details.push(`Requested ${formatDateTime(state.submission.requestedAt)}`);
  }
  if (state.submission.reviewedAt) {
    details.push(`Reviewed ${formatDateTime(state.submission.reviewedAt)}`);
  }
  if (state.submission.submittedToPlbseAt) {
    details.push(`PLBSE upload ${formatDateTime(state.submission.submittedToPlbseAt)}`);
  }
  if (state.submission.reviewerName) {
    details.push(`Reviewer: ${state.submission.reviewerName}`);
  }

  submissionStatusCardEl.innerHTML = `
    <div class="status-card-head">
      <span class="badge" data-status="${status}">${formatSubmissionStatus(status)}</span>
    </div>
    <p class="status-card-copy">${escapeHtml(getTeacherStatusMessage(status))}</p>
    <p class="status-card-meta">${escapeHtml(details.join(' • ') || 'No submission activity yet.')}</p>
    <p class="status-card-notes">${escapeHtml(state.submission.adminNotes || state.submission.teacherNotes || 'No submission notes yet.')}</p>
  `;

  requestReviewButtonEl.disabled = !canRequestReview();
}

function renderTeacherPacketLink() {
  if (state.teacher?.id) {
    openPacketButtonEl.href = buildPacketUrl(state.teacher.id);
    openPacketButtonEl.classList.remove('button-disabled');
    openPacketButtonEl.removeAttribute('aria-disabled');
  } else {
    openPacketButtonEl.removeAttribute('href');
    openPacketButtonEl.setAttribute('aria-disabled', 'true');
    openPacketButtonEl.classList.add('button-disabled');
  }
}

function renderSubmissionSummary() {
  const teacherName = escapeHtml(state.profile.teacherName || state.teacher?.name || 'Teacher not added');
  const schoolName = escapeHtml(state.profile.schoolName || state.teacher?.school || 'School not added');
  const licenseArea = escapeHtml(state.profile.licenseArea || 'License area not added');
  const renewalCycle = escapeHtml(state.profile.renewalCycle || 'Renewal cycle not added');
  const loggedHours = sumLoggedHours();
  const targetHours = Number(state.profile.hoursTarget) || defaultState.profile.hoursTarget;
  const readyCount = state.activities.filter((activity) => activity.fileName).length;
  const missingCount = countMissingItems();

  submissionSummaryEl.innerHTML = `
    <div class="summary-group">
      <span class="summary-label">Teacher</span>
      <strong>${teacherName}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">School or District</span>
      <strong>${schoolName}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">License Area</span>
      <strong>${licenseArea}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Renewal Cycle</span>
      <strong>${renewalCycle}</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Hours Summary</span>
      <strong>${formatHours(loggedHours)} of ${formatHours(targetHours)} logged</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Files Ready for PLBSE</span>
      <strong>${readyCount} uploaded evidence files</strong>
    </div>
    <div class="summary-group">
      <span class="summary-label">Outstanding Items</span>
      <strong>${missingCount === 0 ? 'Submission packet looks complete' : `${missingCount} item(s) still need attention`}</strong>
    </div>
  `;
}

function buildChecklistItems() {
  const targetHours = Number(state.profile.hoursTarget) || defaultState.profile.hoursTarget;
  const loggedHours = sumLoggedHours();
  const hasTeacherName = Boolean(state.profile.teacherName || state.teacher?.name);
  const hasSchool = Boolean(state.profile.schoolName || state.teacher?.school);
  const hasCycle = Boolean(state.profile.renewalCycle);
  const hasActivities = state.activities.length > 0;
  const filesReady = state.activities.every((activity) => Boolean(activity.fileName && activity.fileUrl)) && hasActivities;

  return [
    {
      done: hasTeacherName,
      label: 'Add the teacher profile so every record is tied to the correct person.',
    },
    {
      done: hasSchool,
      label: 'Add the school or district to keep the renewal packet organized.',
    },
    {
      done: hasCycle,
      label: 'Add the renewal cycle to keep records grouped for the correct PLBSE submission window.',
    },
    {
      done: loggedHours >= targetHours,
      label: `Log at least ${formatHours(targetHours)} CEU hours before submitting.`,
    },
    {
      done: hasActivities,
      label: 'Save each professional learning activity in the records list.',
    },
    {
      done: filesReady,
      label: 'Attach a supporting file for every activity so the final packet is ready to upload to PLBSE.',
    },
  ];
}

function canRequestReview() {
  const status = state.submission.status || 'draft';
  return countMissingItems() === 0 && (status === 'draft' || status === 'needs_changes');
}

function countMissingItems() {
  return buildChecklistItems().filter((item) => !item.done).length;
}

function sumLoggedHours() {
  return state.activities.reduce((total, activity) => total + (Number(activity.hours) || 0), 0);
}

function formatHours(hours) {
  return Number.isInteger(hours) ? String(hours) : Number(hours).toFixed(1);
}

function formatDate(value) {
  if (!value) {
    return 'Date not added';
  }

  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
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

function getTeacherStatusMessage(status) {
  const messages = {
    draft: 'Keep organizing CEU records until everything is ready for admin review.',
    pending_review: 'Your packet is in the admin review queue.',
    needs_changes: 'Admin review found items that need updates before PLBSE upload.',
    approved: 'Your packet is approved and ready for the final PLBSE upload step.',
    submitted_to_plbse: 'This packet has been marked as uploaded to PLBSE.',
  };

  return messages[status] || messages.draft;
}

function buildPacketUrl(teacherId) {
  return `/packet/${encodeURIComponent(teacherId)}`;
}

function setStatus(message, tone = 'info', timeoutMs = 0) {
  statusBannerEl.textContent = message;
  statusBannerEl.dataset.tone = tone;
  statusBannerEl.hidden = !message;

  if (timeoutMs > 0) {
    window.setTimeout(() => {
      if (statusBannerEl.textContent === message) {
        statusBannerEl.textContent = '';
        statusBannerEl.hidden = true;
      }
    }, timeoutMs);
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'same-origin',
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      !url.startsWith('/api/admin/') &&
      (response.status === 401 ||
        payload.error === 'This teacher account is inactive. Contact an admin for access.' ||
        payload.error === 'Sign in to continue.')
    ) {
      clearTeacherWorkspace();
    }

    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadSummary() {
  const lines = [
    `Teacher: ${state.profile.teacherName || state.teacher?.name || 'Not added'}`,
    `School or District: ${state.profile.schoolName || state.teacher?.school || 'Not added'}`,
    `License Area: ${state.profile.licenseArea || 'Not added'}`,
    `Renewal Cycle: ${state.profile.renewalCycle || 'Not added'}`,
    `Target Hours: ${state.profile.hoursTarget || defaultState.profile.hoursTarget}`,
    `Logged Hours: ${formatHours(sumLoggedHours())}`,
    `Packet Status: ${formatSubmissionStatus(state.submission.status)}`,
    `Admin Notes: ${state.submission.adminNotes || 'None'}`,
    '',
    'Activities:',
    ...state.activities.map((activity, index) =>
      [
        `${index + 1}. ${activity.title}`,
        `Provider: ${activity.provider}`,
        `Completed On: ${formatDate(activity.completedOn)}`,
        `Hours: ${formatHours(activity.hours)}`,
        `Type: ${activity.type}`,
        `File: ${activity.fileName || 'Missing file'}`,
        `File URL: ${activity.fileUrl || 'Not available'}`,
        `Notes: ${activity.notes || 'None'}`,
        '',
      ].join('\n')
    ),
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ceu-submission-summary.txt';
  link.click();
  URL.revokeObjectURL(url);
}
