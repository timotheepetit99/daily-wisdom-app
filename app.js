// ==================== STATE MANAGEMENT ====================
let currentWisdom = null;
let notificationsEnabled =
  localStorage.getItem('notificationsEnabled') === 'true';
let notificationTime = localStorage.getItem('notificationTime') || '09:00';
let wisdomsDatabase = [];

// ==================== DOM ELEMENTS ====================
const elements = {
  homeView: document.getElementById('homeView'),
  settingsView: document.getElementById('settingsView'),
  wisdomText: document.getElementById('wisdomText'),
  categoryEmoji: document.getElementById('categoryEmoji'),
  categoryName: document.getElementById('categoryName'),
  settingsBtn: document.getElementById('settingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  notifToggle: document.getElementById('notifToggle'),
  timePickerCard: document.getElementById('timePickerCard'),
  timeDisplay: document.getElementById('timeDisplay'),
  timePicker: document.getElementById('timePicker'),
  timeInput: document.getElementById('timeInput'),
};

// ==================== INITIALIZATION ====================
async function init() {
  console.log('🚀 Initialisation de Daily Wisdom...');

  // Charge les anecdotes
  await loadWisdoms();

  // Charge l'anecdote du jour
  loadTodayWisdom();

  // Restaure les paramètres
  elements.notifToggle.checked = notificationsEnabled;
  elements.timeInput.value = notificationTime;
  elements.timeDisplay.textContent = notificationTime;
  updateTimePickerVisibility();

  // Event listeners
  setupEventListeners();

  // Enregistre le Service Worker
  registerServiceWorker();

  console.log('✅ Daily Wisdom prêt !');
}

// ==================== LOAD WISDOMS ====================
async function loadWisdoms() {
  try {
    const response = await fetch('anecdotes.json');
    wisdomsDatabase = await response.json();
    console.log(`📚 ${wisdomsDatabase.length} anecdotes chargées`);
  } catch (error) {
    console.error('❌ Erreur chargement anecdotes:', error);
    // Fallback : anecdotes en dur
    wisdomsDatabase = [
      {
        id: 1,
        text: "En 1518, une 'épidémie de danse' a frappé Strasbourg : des centaines de personnes ont dansé sans arrêt pendant des jours, certaines jusqu'à l'épuisement mortel. Les causes restent mystérieuses.",
        category: 'Histoire',
        emoji: '📜',
      },
      {
        id: 2,
        text: 'Le miel ne pourrit jamais. Des archéologues ont trouvé des pots de miel vieux de 3000 ans dans des tombes égyptiennes, et il était encore parfaitement comestible.',
        category: 'Science',
        emoji: '🔬',
      },
      {
        id: 3,
        text: 'Les pieuvres ont trois cœurs et du sang bleu. Deux cœurs pompent le sang vers les branchies, tandis que le troisième pompe vers le reste du corps.',
        category: 'Nature',
        emoji: '🌿',
      },
    ];
  }
}

// ==================== DAILY WISDOM ====================
function loadTodayWisdom() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem('lastWisdomDate');
  const savedWisdomId = localStorage.getItem('currentWisdomId');

  // Si c'est un nouveau jour, génère une nouvelle anecdote
  if (savedDate !== today) {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    const index = dayOfYear % wisdomsDatabase.length;
    currentWisdom = wisdomsDatabase[index];

    localStorage.setItem('lastWisdomDate', today);
    localStorage.setItem('currentWisdomId', currentWisdom.id);
  } else if (savedWisdomId) {
    // Charge l'anecdote sauvegardée
    currentWisdom =
      wisdomsDatabase.find((w) => w.id == savedWisdomId) || wisdomsDatabase[0];
  } else {
    currentWisdom = wisdomsDatabase[0];
  }

  displayWisdom();
}

function displayWisdom() {
  if (!currentWisdom) return;

  elements.wisdomText.textContent = currentWisdom.text;
  elements.categoryEmoji.textContent = currentWisdom.emoji;
  elements.categoryName.textContent = currentWisdom.category;

  // Animation
  elements.wisdomText.style.opacity = '0';
  setTimeout(() => {
    elements.wisdomText.style.transition = 'opacity 0.8s ease-out';
    elements.wisdomText.style.opacity = '1';
  }, 100);
}

// ==================== NAVIGATION ====================
function showSettings() {
  elements.homeView.classList.add('hidden');
  elements.settingsView.classList.remove('hidden');
}

function hideSettings() {
  elements.settingsView.classList.add('hidden');
  elements.homeView.classList.remove('hidden');
}

// ==================== NOTIFICATIONS ====================
async function toggleNotifications(enabled) {
  notificationsEnabled = enabled;
  localStorage.setItem('notificationsEnabled', enabled);
  updateTimePickerVisibility();

  if (enabled) {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      elements.notifToggle.checked = false;
      notificationsEnabled = false;
      localStorage.setItem('notificationsEnabled', 'false');
      alert(
        '❌ Veuillez autoriser les notifications dans les paramètres de votre navigateur'
      );
    } else {
      scheduleNotification();
    }
  } else {
    cancelNotifications();
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('❌ Votre navigateur ne supporte pas les notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

function scheduleNotification() {
  console.log(`⏰ Notification programmée pour ${notificationTime}`);
  // La logique de planification sera dans le Service Worker
}

function cancelNotifications() {
  console.log('🔕 Notifications annulées');
}

function updateTimePickerVisibility() {
  if (notificationsEnabled) {
    elements.timePickerCard.classList.remove('hidden');
  } else {
    elements.timePickerCard.classList.add('hidden');
  }
}

// ==================== TIME PICKER ====================
function toggleTimePicker() {
  elements.timePicker.classList.toggle('hidden');
}

function updateTime(time) {
  notificationTime = time;
  elements.timeDisplay.textContent = time;
  localStorage.setItem('notificationTime', time);

  if (notificationsEnabled) {
    scheduleNotification();
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  elements.settingsBtn.addEventListener('click', showSettings);
  elements.closeSettingsBtn.addEventListener('click', hideSettings);

  elements.notifToggle.addEventListener('change', (e) => {
    toggleNotifications(e.target.checked);
  });

  elements.timeDisplay.addEventListener('click', toggleTimePicker);

  elements.timeInput.addEventListener('change', (e) => {
    updateTime(e.target.value);
  });
}

// ==================== SERVICE WORKER ====================
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js'
      );
      console.log('✅ Service Worker enregistré:', registration);
    } catch (error) {
      console.error('❌ Erreur Service Worker:', error);
    }
  }
}

// ==================== START APP ====================
init();
// ==================== MOUSE TRACKING FOR GLASS EFFECT ====================
document.querySelectorAll('.glass-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  });
});
