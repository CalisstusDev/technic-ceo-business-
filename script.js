import { supabase, testConnection } from './supabaseClient.js';

// Test Supabase connection on load
testConnection();

// Global state
let currentUser = null;
let currentChatUser = null;
let notificationCount = 0;
let messageCount = 0;

// Authentication System
class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    this.setupAuthUI();
    this.checkSession();
    this.setupEventListeners();
  }

  setupAuthUI() {
    this.modal = document.getElementById('auth-modal');
    this.loginForm = document.getElementById('login-form');
    this.signupForm = document.getElementById('signup-form');
    this.tabs = document.querySelectorAll('.auth-tab');
    this.authButtons = document.querySelector('.auth-buttons');
    this.userMenu = document.getElementById('user-menu');
    this.userName = document.getElementById('user-name');
    this.userAvatar = document.getElementById('user-avatar');
  }

  setupEventListeners() {
    // Modal controls
    document.getElementById('auth-modal-close').addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Auth buttons
    document.getElementById('login-btn').addEventListener('click', () => this.openModal('login'));
    document.getElementById('google-login').addEventListener('click', () => this.handleGoogleAuth('login'));
    document.getElementById('google-signup').addEventListener('click', () => this.handleGoogleAuth('signup'));
    document.getElementById('discord-login').addEventListener('click', () => this.handleDiscordAuth('login'));
    document.getElementById('discord-signup').addEventListener('click', () => this.handleDiscordAuth('signup'));
    document.getElementById('logout-btn').addEventListener('click', () => this.signOut());

    // User profile dropdown
    document.getElementById('user-profile-btn').addEventListener('click', () => this.toggleUserDropdown());
    
    // Profile link in dropdown
    const profileLink = document.querySelector('.user-dropdown a[href="profile.html"]');
    if (profileLink) {
      profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadProfileSection();
      });
    }

    // Form submissions
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));

    // Google Auth
    document.getElementById('google-login').addEventListener('click', () => this.handleGoogleAuth('login'));
    document.getElementById('google-signup').addEventListener('click', () => this.handleGoogleAuth('signup'));

    // Password toggles
    document.querySelectorAll('.password-toggle').forEach(button => {
      button.addEventListener('click', () => this.togglePassword(button));
    });
  }

  openModal(tab) {
    this.modal.classList.add('is-open');
    this.switchTab(tab);
  }

  closeModal() {
    this.modal.classList.remove('is-open');
    this.clearStatus();
  }

  switchTab(tab) {
    this.tabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    if (tab === 'login') {
      this.loginForm.style.display = 'flex';
      this.signupForm.style.display = 'none';
    } else {
      this.loginForm.style.display = 'none';
      this.signupForm.style.display = 'flex';
    }
  }

  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      currentUser = session.user;
      this.updateUIForLoggedInUser();
      initializeUserFeatures();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this.currentUser = session.user;
        currentUser = session.user;
        this.updateUIForLoggedInUser();
        initializeUserFeatures();
        createNotification('signup', { email: session.user.email });
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        currentUser = null;
        this.updateUIForLoggedOutUser();
        hideUserFeatures();
      }
    });
  }

  updateUIForLoggedInUser() {
    this.authButtons.style.display = 'none';
    this.userMenu.style.display = 'flex';
    const name = this.currentUser?.user_metadata?.full_name || this.currentUser?.email?.split('@')[0] || 'User';
    this.userName.textContent = name;
    this.userAvatar.textContent = name.charAt(0).toUpperCase();

    // Show all navigation items when logged in
    document.querySelectorAll('.nav-menu-item').forEach(item => {
      item.style.display = 'block';
    });
  }

  updateUIForLoggedOutUser() {
    this.authButtons.style.display = 'flex';
    this.userMenu.style.display = 'none';

    // Hide all navigation items when logged out
    document.querySelectorAll('.nav-menu-item').forEach(item => {
      item.style.display = 'none';
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(this.loginForm);
    const email = formData.get('email');
    const password = formData.get('password');

    this.showStatus('Signing in...', 'info');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      this.showStatus(error.message, 'error');
    } else {
      this.showStatus('Successfully signed in!', 'success');
      setTimeout(() => this.closeModal(), 1500);
      createNotification('login', { email });
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(this.signupForm);
    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      this.showStatus('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      this.showStatus('Password must be at least 6 characters', 'error');
      return;
    }

    this.showStatus('Creating account...', 'info');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      this.showStatus(error.message, 'error');
    } else {
      this.showStatus('Account created! Please check your email to verify.', 'success');
      setTimeout(() => this.closeModal(), 2000);
    }
  }

  async handleGoogleAuth(type) {
    this.showStatus('Connecting to Google...', 'info');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        if (error.message.includes('not enabled')) {
          this.showStatus('Google auth not enabled. Contact administrator.', 'error');
          alert('Google authentication is not enabled in your Supabase project. Please:\n1. Go to Supabase Dashboard → Authentication → Providers\n2. Enable Google provider\n3. Add your Google OAuth credentials\n4. Add this URL to allowed redirects: ' + window.location.origin);
        } else {
          this.showStatus(error.message, 'error');
        }
        console.error('Google auth error:', error);
      }
    } catch (err) {
      this.showStatus('Connection error. Please try again.', 'error');
      console.error('Google auth exception:', err);
    }
  }

  async handleDiscordAuth(type) {
    this.showStatus('Connecting to Discord...', 'info');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        if (error.message.includes('not enabled')) {
          this.showStatus('Discord auth not enabled. Contact administrator.', 'error');
          alert('Discord authentication is not enabled in your Supabase project. Please:\n1. Go to Supabase Dashboard → Authentication → Providers\n2. Enable Discord provider\n3. Add your Discord OAuth credentials\n4. Add this URL to allowed redirects: ' + window.location.origin);
        } else {
          this.showStatus(error.message, 'error');
        }
        console.error('Discord auth error:', error);
      }
    } catch (err) {
      this.showStatus('Connection error. Please try again.', 'error');
      console.error('Discord auth exception:', err);
    }
  }

  async signOut() {
    this.closeUserDropdown();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
  }

  showStatus(message, type) {
    const status = document.getElementById('auth-status');
    status.textContent = message;
    status.className = `auth-status ${type}`;
  }

  clearStatus() {
    const status = document.getElementById('auth-status');
    status.textContent = '';
    status.className = 'auth-status';
  }

  togglePassword(button) {
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);
    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');

    if (input.type === 'password') {
      input.type = 'text';
      eyeOpen.style.display = 'none';
      eyeClosed.style.display = 'block';
      button.setAttribute('aria-label', 'Hide password');
    } else {
      input.type = 'password';
      eyeOpen.style.display = 'block';
      eyeClosed.style.display = 'none';
      button.setAttribute('aria-label', 'Show password');
    }
  }

  toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    const btn = document.getElementById('user-profile-btn');
    dropdown.classList.toggle('is-open');
    btn.classList.toggle('is-open');
  }

  closeUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    const btn = document.getElementById('user-profile-btn');
    dropdown.classList.remove('is-open');
    btn.classList.remove('is-open');
  }

  async loadProfileSection() {
    // Show profile section
    document.querySelectorAll('section').forEach(section => {
      if (section.id !== 'home' && section.id !== 'about' && section.id !== 'services' && section.id !== 'portfolio' && section.id !== 'pricing' && section.id !== 'testimonials' && section.id !== 'insights' && section.id !== 'contact') {
        section.style.display = 'none';
      }
    });
    
    const profileSection = document.getElementById('profile');
    if (profileSection) {
      profileSection.style.display = 'block';
      profileSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Reload profile data
    await this.loadProfile();
    this.closeUserDropdown();
  }

  async loadProfileSection() {
    // Show profile section
    document.querySelectorAll('section').forEach(section => {
      if (section.id !== 'home' && section.id !== 'about' && section.id !== 'services' && section.id !== 'portfolio' && section.id !== 'pricing' && section.id !== 'testimonials' && section.id !== 'insights' && section.id !== 'contact') {
        section.style.display = 'none';
      }
    });
    
    const profileSection = document.getElementById('profile');
    if (profileSection) {
      profileSection.style.display = 'block';
      profileSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Reload profile data
    await this.loadProfile();
    this.closeUserDropdown();
  }
}

// User Profile System
class UserProfileSystem {
  constructor() {
    this.userRole = 'member';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadProfile();
  }

  setupEventListeners() {
    document.getElementById('edit-profile-btn').addEventListener('click', () => this.openEditModal());
    document.getElementById('edit-profile-close').addEventListener('click', () => this.closeEditModal());
    document.getElementById('edit-profile-modal').addEventListener('click', (e) => {
      if (e.target.id === 'edit-profile-modal') this.closeEditModal();
    });
    document.getElementById('edit-profile-form').addEventListener('submit', (e) => this.handleProfileUpdate(e));

    // Avatar upload
    document.getElementById('upload-avatar-btn').addEventListener('click', () => {
      document.getElementById('avatar-upload').click();
    });

    document.getElementById('avatar-upload').addEventListener('change', (e) => this.handleAvatarUpload(e));

    // Avatar delete
    document.getElementById('delete-avatar-btn').addEventListener('click', () => this.handleAvatarDelete());
  }

  async loadProfile() {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (data) {
      this.userRole = data.role || 'member';
      this.displayProfile(data);
    }
  }

  async displayProfile(profile) {
    const name = profile.full_name || currentUser?.user_metadata?.full_name || 'User';
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role').textContent = this.formatRole(profile.role || 'member');
    document.getElementById('profile-role-detail').textContent = this.formatRole(profile.role || 'member');

    // Handle avatar display
    const avatarImage = document.getElementById('profile-avatar-large');
    const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const deleteBtn = document.getElementById('delete-avatar-btn');

    if (profile.avatar_path) {
      // Try to load the private image
      const { data: imageData, error: imageError } = await supabase
        .storage
        .from('profile-images')
        .createSignedUrl(`${currentUser.id}/avatar`, 60);

      if (imageError) {
        // If RLS denies access, show placeholder
        console.log('Cannot access avatar image:', imageError);
        avatarImage.style.display = 'none';
        avatarPlaceholder.style.display = 'grid';
        avatarPlaceholder.textContent = name.charAt(0).toUpperCase();
        deleteBtn.style.display = 'none';
      } else {
        avatarImage.src = imageData.signedUrl;
        avatarImage.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        deleteBtn.style.display = 'block';
      }
    } else {
      avatarImage.style.display = 'none';
      avatarPlaceholder.style.display = 'grid';
      avatarPlaceholder.textContent = name.charAt(0).toUpperCase();
      deleteBtn.style.display = 'none';
    }

    document.getElementById('profile-bio').textContent = profile.bio || 'No bio added yet';
    document.getElementById('profile-location').textContent = profile.location || 'Not specified';
    document.getElementById('profile-website').textContent = profile.website || 'Not specified';
    document.getElementById('profile-joined').textContent = new Date(profile.created_at).toLocaleDateString();
  }

  formatRole(role) {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  }

  async handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}/avatar.${fileExt}`;

    try {
      // Upload to private storage
      const { error: uploadError } = await supabase
        .storage
        .from('profile-images')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: fileName })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Reload profile to show new avatar
      await this.loadProfile();
      createNotification('profile_update', { action: 'avatar_upload' });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar: ' + error.message);
    }

    // Reset file input
    e.target.value = '';
  }

  async handleAvatarDelete() {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete your profile image?')) return;

    try {
      // Delete from storage
      const { error: deleteError } = await supabase
        .storage
        .from('profile-images')
        .remove([`${currentUser.id}/avatar`]);

      if (deleteError && deleteError.message !== 'Object not found') {
        throw deleteError;
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: null })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Reload profile
      await this.loadProfile();
      createNotification('profile_update', { action: 'avatar_delete' });

    } catch (error) {
      console.error('Error deleting avatar:', error);
      alert('Error deleting avatar: ' + error.message);
    }
  }

  openEditModal() {
    this.loadProfileData();
    document.getElementById('edit-profile-modal').classList.add('is-open');
  }

  closeEditModal() {
    document.getElementById('edit-profile-modal').classList.remove('is-open');
  }

  async loadProfileData() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (data) {
      document.getElementById('edit-full-name').value = data.full_name || '';
      document.getElementById('edit-bio').value = data.bio || '';
      document.getElementById('edit-location').value = data.location || '';
      document.getElementById('edit-website').value = data.website || '';
      document.getElementById('edit-role').value = data.role || 'member';

      // Show role field only for super_admin
      const roleLabel = document.getElementById('role-label');
      const roleSelect = document.getElementById('edit-role');
      if (this.userRole === 'super_admin') {
        roleLabel.style.display = 'flex';
        roleSelect.disabled = false;
      } else {
        roleLabel.style.display = 'none';
        roleSelect.disabled = true;
      }
    }
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profileData = {
      full_name: formData.get('fullName'),
      bio: formData.get('bio'),
      location: formData.get('location'),
      website: formData.get('website'),
      updated_at: new Date().toISOString()
    };

    // Only allow role changes for super_admin
    if (this.userRole === 'super_admin') {
      profileData.role = formData.get('role');
    }

    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', currentUser.id);

    if (error) {
      alert('Error updating profile: ' + error.message);
    } else {
      this.closeEditModal();
      this.loadProfile();
      createNotification('profile_update', profileData);
    }
  }
}

// User-to-User Chat System
class UserChatSystem {
  constructor() {
    this.currentConversation = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadConversations();
  }

  setupEventListeners() {
    const chatInput = document.querySelector('.chat-input-area-chat textarea');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  async loadConversations() {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('user_chats')
      .select('*, sender:sender_id(id, user_metadata), receiver:receiver_id(id, user_metadata)')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      this.displayConversations(data);
    }
  }

  displayConversations(conversations) {
    const container = document.getElementById('conversations-list');
    const uniqueUsers = new Map();

    conversations.forEach(chat => {
      const otherUserId = chat.sender_id === currentUser.id ? chat.receiver_id : chat.sender_id;
      if (!uniqueUsers.has(otherUserId)) {
        uniqueUsers.set(otherUserId, {
          userId: otherUserId,
          lastMessage: chat.message,
          lastTime: chat.created_at,
          user: chat.sender_id === currentUser.id ? chat.receiver : chat.sender
        });
      }
    });

    container.innerHTML = Array.from(uniqueUsers.values()).map(conv => `
      <div class="conversation-item" data-user-id="${conv.userId}">
        <div class="conversation-avatar">${conv.user?.user_metadata?.full_name?.charAt(0) || 'U'}</div>
        <div class="conversation-info">
          <h4 class="conversation-name">${conv.user?.user_metadata?.full_name || 'Unknown User'}</h4>
          <p class="conversation-preview">${conv.lastMessage}</p>
        </div>
        <span class="conversation-time">${this.formatTime(conv.lastTime)}</span>
      </div>
    `).join('');

    container.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => this.openConversation(item.dataset.userId));
    });
  }

  async openConversation(userId) {
    this.currentConversation = userId;
    currentChatUser = userId;

    // Update UI
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.userId === userId) item.classList.add('active');
    });

    // Load messages
    await this.loadMessages(userId);

    // Update chat area
    const chatArea = document.getElementById('chat-area');
    chatArea.innerHTML = `
      <div class="chat-header" style="padding: 16px 20px; border-bottom: 1px solid var(--line);">
        <h3>Conversation</h3>
      </div>
      <div class="chat-messages-area" id="chat-messages"></div>
      <div class="chat-input-area-chat">
        <textarea placeholder="Type your message..." rows="2"></textarea>
        <button class="button button-orange" id="send-chat-message">Send</button>
      </div>
    `;

    // Setup send button
    document.getElementById('send-chat-message').addEventListener('click', () => this.sendMessage());
    document.querySelector('.chat-input-area-chat textarea').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  async loadMessages(userId) {
    const { data, error } = await supabase
      .from('user_chats')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      this.displayMessages(data);
    }
  }

  displayMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = messages.map(msg => `
      <div class="chat-message-bubble ${msg.sender_id === currentUser.id ? 'sent' : 'received'}">
        <div class="chat-message-avatar">${msg.sender_id === currentUser.id ? 'Y' : 'T'}</div>
        <div>
          <div class="chat-message-content">${this.escapeHtml(msg.message)}</div>
          <div class="chat-message-time">${this.formatTime(msg.created_at)}</div>
        </div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  async sendMessage() {
    const input = document.querySelector('.chat-input-area-chat textarea');
    const message = input.value.trim();

    if (!message || !this.currentConversation) return;

    const { error } = await supabase
      .from('user_chats')
      .insert([{
        sender_id: currentUser.id,
        receiver_id: this.currentConversation,
        message: message
      }]);

    if (error) {
      alert('Error sending message: ' + error.message);
    } else {
      input.value = '';
      this.loadMessages(this.currentConversation);
      createNotification('message_sent', { to: this.currentConversation, message });
    }
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Notifications System
class NotificationSystem {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadNotifications();
    this.startPolling();
  }

  setupEventListeners() {
    document.getElementById('mark-all-read').addEventListener('click', () => this.markAllAsRead());
  }

  async loadNotifications() {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      this.displayNotifications(data);
      this.updateBadge(data.filter(n => !n.is_read).length);
    }
  }

  displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');

    if (notifications.length === 0) {
      container.innerHTML = '<div class="notification-empty">No notifications yet</div>';
      return;
    }

    container.innerHTML = notifications.map(notif => `
      <div class="notification-item ${notif.is_read ? '' : 'unread'}">
        <div class="notification-icon">🔔</div>
        <div class="notification-content">
          <h4 class="notification-title">${this.getNotificationTitle(notif.action_type)}</h4>
          <p class="notification-description">${this.getNotificationDescription(notif)}</p>
          <span class="notification-time">${new Date(notif.created_at).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  }

  getNotificationTitle(actionType) {
    const titles = {
      'signup': 'New User Signup',
      'login': 'User Login',
      'message_sent': 'New Message',
      'contact': 'New Contact Inquiry',
      'profile_update': 'Profile Updated'
    };
    return titles[actionType] || 'New Activity';
  }

  getNotificationDescription(notif) {
    const descriptions = {
      'signup': `User ${notif.action_details?.email} signed up`,
      'login': `User ${notif.action_details?.email} logged in`,
      'message_sent': `Message sent to user`,
      'contact': `New contact form submission`,
      'profile_update': `User updated their profile`
    };
    return descriptions[notif.action_type] || 'User activity detected';
  }

  updateBadge(count) {
    const badge = document.getElementById('notification-badge');
    notificationCount = count;
    badge.textContent = count > 0 ? count : '';
  }

  async markAllAsRead() {
    if (!currentUser) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id);

    this.loadNotifications();
  }

  startPolling() {
    setInterval(() => {
      this.loadNotifications();
    }, 30000); // Poll every 30 seconds
  }
}

// Users Directory System
class UsersDirectorySystem {
  constructor() {
    this.currentUserRole = 'member';
    this.init();
  }

  async init() {
    // Get current user's role
    if (currentUser) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (profileData) {
        this.currentUserRole = profileData.role || 'member';
      }
    }

    await this.loadUsers();
  }

  async loadUsers() {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUser.id);

    if (data) {
      this.displayUsers(data);
    }
  }

  async displayUsers(users) {
    const container = document.getElementById('users-grid');

    if (users.length === 0) {
      container.innerHTML = '<div class="notification-empty">No other users yet</div>';
      return;
    }

    // Filter users based on role permissions
    const visibleUsers = users.filter(user => {
      if (this.currentUserRole === 'member') {
        // Members can only see other members
        return user.role === 'member';
      } else if (this.currentUserRole === 'admin') {
        // Admins can see members and admins
        return user.role === 'member' || user.role === 'admin';
      } else if (this.currentUserRole === 'super_admin') {
        // Super admins can see everyone
        return true;
      }
      return false;
    });

    container.innerHTML = await Promise.all(visibleUsers.map(async (user) => {
      const name = user.full_name || 'Unknown User';
      const avatarHtml = await this.getUserAvatar(user);
      const roleBadge = this.getRoleBadge(user.role);

      return `
        <div class="user-card">
          <div class="user-card-header">
            ${avatarHtml}
            <div>
              <h3 class="user-card-name">${name}</h3>
              <p class="user-card-email">${user.email || 'No email'}</p>
              ${roleBadge}
            </div>
          </div>
          <p class="user-card-bio">${user.bio || 'No bio available'}</p>
          <div class="user-card-actions">
            <button class="button button-orange" onclick="startChat('${user.id}')">Message</button>
            <button class="button button-outline" onclick="viewProfile('${user.id}')">View Profile</button>
          </div>
        </div>
      `;
    })).then(htmlArray => htmlArray.join(''));
  }

  async getUserAvatar(user) {
    if (!user.avatar_path) {
      return `<div class="user-card-avatar">${user.full_name?.charAt(0) || 'U'}</div>`;
    }

    try {
      const { data: imageData, error } = await supabase
        .storage
        .from('profile-images')
        .createSignedUrl(user.avatar_path, 60);

      if (error) {
        // RLS denied access, show placeholder
        return `<div class="user-card-avatar">${user.full_name?.charAt(0) || 'U'}</div>`;
      }

      return `<img class="user-card-avatar" src="${imageData.signedUrl}" alt="${user.full_name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">`;
    } catch (error) {
      console.log('Cannot access user avatar:', error);
      return `<div class="user-card-avatar">${user.full_name?.charAt(0) || 'U'}</div>`;
    }
  }

  getRoleBadge(role) {
    if (!role || role === 'member') return '';
    const colors = {
      'admin': '#84cc16',
      'super_admin': '#171916'
    };
    return `<span class="user-role-badge" style="display: inline-block; margin-top: 4px; padding: 2px 8px; color: white; background: ${colors[role] || '#84cc16'}; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;">${role.replace('_', ' ')}</span>`;
  }
}

// Helper Functions
async function createNotification(actionType, actionDetails) {
  if (!currentUser) return;

  await supabase
    .from('notifications')
    .insert([{
      user_id: currentUser.id,
      action_type: actionType,
      action_details: actionDetails
    }]);
}

async function initializeUserFeatures() {
  await new UserProfileSystem();
  new UserChatSystem();
  new NotificationSystem();
  new UsersDirectorySystem();
}

function hideUserFeatures() {
  document.getElementById('profile').style.display = 'none';
  document.getElementById('users').style.display = 'none';
  document.getElementById('messages').style.display = 'none';
  document.getElementById('notifications').style.display = 'none';
}

window.startChat = function(userId) {
  document.getElementById('messages').style.display = 'block';
  document.getElementById('profile').style.display = 'none';
  document.getElementById('users').style.display = 'none';
  document.getElementById('notifications').style.display = 'none';

  const chatSystem = new UserChatSystem();
  chatSystem.openConversation(userId);
};

window.viewProfile = function(userId) {
  // Implementation for viewing other user profiles
  alert('View profile feature coming soon');
};

// Navigation handling - No longer needed for multi-page app
// All navigation links now go to separate HTML pages directly

// Menu functionality
const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  primaryNav.classList.remove("is-open");
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
  primaryNav.classList.toggle("is-open", !isOpen);
  
  // Close user dropdown when opening menu
  if (!isOpen && authSystem) {
    authSystem.closeUserDropdown();
  }
});

primaryNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    if (authSystem) {
      authSystem.closeModal();
      authSystem.closeUserDropdown();
    }
  }
});

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
  if (authSystem && !event.target.closest('.user-profile-wrapper')) {
    authSystem.closeUserDropdown();
  }
});

document.getElementById("current-year").textContent = new Date().getFullYear();

// Contact form with Supabase integration
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const formData = new FormData(contactForm);
  const contactData = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || null,
    company: formData.get("company") || null,
    service: formData.get("service"),
    message: formData.get("message"),
    created_at: new Date().toISOString()
  };

  formStatus.textContent = "Submitting your inquiry...";
  formStatus.style.color = "#84cc16";

  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contactData])
      .select();

    if (error) throw error;

    formStatus.textContent = "✓ Inquiry submitted successfully! We'll be in touch soon.";
    formStatus.style.color = "#2d7a3e";
    contactForm.reset();

    if (currentUser) {
      createNotification('contact', contactData);
    }

    // Also send email notification
    const subject = encodeURIComponent(`Business inquiry: ${contactData.service}`);
    const message = [
      `Name: ${contactData.name}`,
      `Email: ${contactData.email}`,
      `Phone: ${contactData.phone || "Not provided"}`,
      `Company: ${contactData.company || "Not provided"}`,
      `Service: ${contactData.service}`,
      "",
      contactData.message,
    ].join("\n");

    setTimeout(() => {
      window.location.href = `mailto:gabrielgabriel9727@gmail.com?subject=${subject}&body=${encodeURIComponent(message)}`;
    }, 1500);

  } catch (error) {
    console.error('Error submitting form:', error);
    formStatus.textContent = "✗ Error submitting. Please try again or email us directly.";
    formStatus.style.color = "#d64040";
  }
});

// Conversation/Order Chat System
class ConversationSystem {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.init();
  }

  init() {
    this.createChatWidget();
    this.loadConversationHistory();
  }

  createChatWidget() {
    const chatWidget = document.createElement('div');
    chatWidget.className = 'chat-widget';
    chatWidget.innerHTML = `
      <button class="chat-toggle" aria-label="Open conversation">
        <span class="chat-icon">💬</span>
        <span class="chat-badge"></span>
      </button>
      <div class="chat-panel">
        <div class="chat-header">
          <h3>Order Conversation</h3>
          <button class="chat-close" aria-label="Close conversation">×</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-area">
          <textarea id="chat-input" placeholder="Type your message..." rows="2"></textarea>
          <button id="chat-send" class="button button-orange">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(chatWidget);

    const toggle = chatWidget.querySelector('.chat-toggle');
    const close = chatWidget.querySelector('.chat-close');
    const send = chatWidget.querySelector('#chat-send');
    const input = chatWidget.querySelector('#chat-input');

    toggle.addEventListener('click', () => this.toggle());
    close.addEventListener('click', () => this.toggle());
    send.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const widget = document.querySelector('.chat-widget');
    widget.classList.toggle('is-open', this.isOpen);
  }

  async loadConversationHistory() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      this.messages = data || [];
      this.renderMessages();
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = this.messages.map(msg => `
      <div class="chat-message ${msg.role}">
        <div class="message-content">${this.escapeHtml(msg.content)}</div>
        <div class="message-time">${this.formatTime(msg.created_at)}</div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();

    if (!content) return;

    const message = {
      role: 'user',
      content: content,
      created_at: new Date().toISOString()
    };

    this.messages.push(message);
    this.renderMessages();
    input.value = '';

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([message])
        .select();

      if (error) throw error;

      setTimeout(() => {
        this.addAutoResponse();
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      this.showSystemMessage('Error sending message. Please try again.');
    }
  }

  async addAutoResponse() {
    const responses = [
      "Thank you for your message! Our team will review your order inquiry shortly.",
      "We've received your message. A representative will get back to you within 24 hours.",
      "Your order conversation has been saved. We're processing your request.",
      "Thanks for reaching out! We'll respond to your order inquiry as soon as possible."
    ];

    const response = {
      role: 'system',
      content: responses[Math.floor(Math.random() * responses.length)],
      created_at: new Date().toISOString()
    };

    this.messages.push(response);
    this.renderMessages();

    try {
      await supabase.from('conversations').insert([response]);
    } catch (error) {
      console.error('Error saving response:', error);
    }
  }

  showSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = 'chat-message system';
    msg.innerHTML = `<div class="message-content">${text}</div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Initialize systems on DOM load
let authSystem;
document.addEventListener('DOMContentLoaded', () => {
  authSystem = new AuthSystem();
  const conversationSystem = new ConversationSystem();
});

// Reveal animations
const revealTargets = document.querySelectorAll(".service-card, .project-card, .price-card, .article-card, .purpose-item, .why-list article");

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("reveal-ready");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  revealTargets.forEach((target) => {
    target.setAttribute("data-reveal", "");
    revealObserver.observe(target);
  });
}
