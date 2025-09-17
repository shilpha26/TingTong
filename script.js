// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Ting Tong App Starting...');
    initializeApp();
});

// UPDATED: Separate data storage for Lists and Boards
let tasks = [];
let lists = {};        // For List view items
let boards = {};       // For Kanban view items  
let currentFilter = 'all';
let currentList = null;
let currentBoard = null;
let activeTimeouts = new Map();
let currentAudio = null;
let notificationPermission = 'default';

// Background monitoring variables
let isAppVisible = true;
let backgroundCheckInterval = null;

// Mobile menu variables
let isMobileMenuOpen = false;

// Share functionality variables
let currentShareList = null;
let currentShareType = null;

// Kanban tasks storage
let kanbanTasks = [];

// Edit functionality variables
let currentEditingTask = null;
let currentEditingKanbanTask = null;
let currentEditingList = null;
let currentEditingBoard = null;

// Ringtone library
const ringtoneLibrary = {
    bell: null,
    chime: null,
    notification: null
};

// Initialize the app
function initializeApp() {
    console.log('📋 Initializing app...');

    // Load data from localStorage
    loadData();

    // FIXED: Check for shared URLs on startup
    handleSharedURL();

    // Setup ringtones
    setupRingtones();

    // Request notification permission
    setTimeout(() => {
        requestNotificationPermission();
    }, 1000);

    // Setup background monitoring
    setupBackgroundMonitoring();

    // Setup mobile menu
    initializeMobileMenu();

    // Setup share functionality
    setupShareFunctionality();

    // Setup kanban functionality
    setupKanbanFunctionality();

    // Setup edit functionality
    setupEditFunctionality();

    // Setup navigation
    setupNavigation();

    // Setup task management
    setupTaskManagement();

    // Setup ringtone selection
    setupRingtoneHandlers();

    // Setup view toggle
    setupViewToggle();

    // Setup modals
    setupModals();

    // Initial render
    renderTasks();
    renderLists();
    renderBoards();
    renderKanbanTasks();

    // Schedule existing notifications
    setTimeout(() => {
        scheduleAllNotifications();
    }, 2000);

    // Start background monitoring
    startBackgroundMonitoring();

    console.log('✅ App initialized with fixed emoji display and list management');
}

// UPDATED: Handle shared URLs with type detection
function handleSharedURL() {
    console.log('🔗 Checking for shared URL...');

    const urlParams = new URLSearchParams(window.location.search);
    const sharedItem = urlParams.get('shared');
    const shareType = urlParams.get('type') || 'list';  // Default to list
    const ref = urlParams.get('ref');

    if (sharedItem && ref === 'tingtong') {
        console.log('📥 Found shared item:', sharedItem, 'type:', shareType);

        const itemName = sharedItem.charAt(0).toUpperCase() + sharedItem.slice(1);

        if (shareType === 'board') {
            // Check if the board already exists
            if (!boards[sharedItem]) {
                // Create the shared board
                boards[sharedItem] = {
                    name: `${itemName} (Shared)`,
                    emoji: '🗂️',
                    mode: 'board',
                    shared: true,
                    sharedFrom: 'external'
                };

                saveData();
                renderBoards();

                setTimeout(() => {
                    showNotification(
                        '📥 Shared Board Added!',
                        `"${itemName}" board has been added to your Kanban section.`,
                        null,
                        false
                    );
                }, 1500);

                console.log('✅ Added shared board to app:', itemName);
            }
        } else {
            // Check if the list already exists
            if (!lists[sharedItem]) {
                // Create the shared list
                lists[sharedItem] = {
                    name: `${itemName} (Shared)`,
                    emoji: '📋',
                    mode: 'list',
                    shared: true,
                    sharedFrom: 'external'
                };

                saveData();
                renderLists();

                setTimeout(() => {
                    showNotification(
                        '📥 Shared List Added!',
                        `"${itemName}" list has been added to your Lists section.`,
                        null,
                        false
                    );
                }, 1500);

                console.log('✅ Added shared list to app:', itemName);
            }
        }

        // Clean up URL without refresh
        const newURL = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newURL);
    }
}

// UPDATED: Create new list or board with emoji
function createNewItem() {
    const newListName = document.getElementById('newListName');
    const newItemType = document.getElementById('newItemType');
    const newItemEmoji = document.getElementById('newItemEmoji');
    const listModal = document.getElementById('listModal');

    if (!newListName || !newListName.value.trim()) {
        alert('Please enter a name');
        return;
    }

    const itemName = newListName.value.trim();
    const itemType = newItemType.value; // 'list' or 'board'
    const itemEmoji = newItemEmoji.value || '📋';
    const itemKey = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if item already exists
    if (itemType === 'board' && boards[itemKey]) {
        alert('A board with this name already exists');
        return;
    }
    if (itemType === 'list' && lists[itemKey]) {
        alert('A list with this name already exists');
        return;
    }

    // Create new item
    const newItem = {
        name: itemName,
        emoji: itemEmoji,
        mode: itemType,
        shared: false
    };

    if (itemType === 'board') {
        boards[itemKey] = newItem;
    } else {
        lists[itemKey] = newItem;
    }

    // Save and update UI
    saveData();
    renderLists();
    renderBoards();
    updateTaskListOptions();
    updateKanbanBoardOptions();

    // Close modal and clear inputs
    if (listModal) {
        listModal.style.display = 'none';
    }
    newListName.value = '';
    newItemType.value = 'list';
    newItemEmoji.value = '📋';

    // Show success notification
    const typeText = itemType === 'board' ? 'Board' : 'List';
    showNotification(
        `✅ ${typeText} Created!`,
        `"${itemEmoji} ${itemName}" has been added to your ${typeText.toLowerCase()}s.`,
        null,
        false
    );

    console.log(`✅ Created new ${itemType}:`, itemName, itemEmoji);
}

// NEW: Edit list/board functionality
function editItem(itemKey, itemType) {
    console.log(`✏️ Editing ${itemType}:`, itemKey);

    const item = itemType === 'board' ? boards[itemKey] : lists[itemKey];
    if (!item) return;

    if (itemType === 'board') {
        currentEditingBoard = { key: itemKey, ...item };
    } else {
        currentEditingList = { key: itemKey, ...item };
    }

    // Pre-populate modal
    const newListName = document.getElementById('newListName');
    const newItemType = document.getElementById('newItemType');
    const newItemEmoji = document.getElementById('newItemEmoji');
    const modalTitle = document.getElementById('modalTitle');
    const createBtn = document.getElementById('createListBtn');
    const listModal = document.getElementById('listModal');

    if (newListName) newListName.value = item.name;
    if (newItemType) newItemType.value = itemType;
    if (newItemEmoji) newItemEmoji.value = item.emoji || '📋';
    if (modalTitle) modalTitle.textContent = `Edit ${itemType === 'board' ? 'Board' : 'List'}`;
    if (createBtn) createBtn.textContent = 'Save';

    if (listModal) {
        listModal.style.display = 'flex';
        setTimeout(() => newListName.focus(), 100);
    }
}

// NEW: Save edited list/board
function saveEditedItem() {
    const isEditingBoard = currentEditingBoard !== null;
    const currentItem = isEditingBoard ? currentEditingBoard : currentEditingList;

    if (!currentItem) {
        createNewItem();
        return;
    }

    const newListName = document.getElementById('newListName');
    const newItemEmoji = document.getElementById('newItemEmoji');

    if (!newListName || !newListName.value.trim()) {
        alert('Please enter a name');
        return;
    }

    const newName = newListName.value.trim();
    const newEmoji = newItemEmoji.value || '📋';

    // Update the item
    if (isEditingBoard) {
        boards[currentItem.key].name = newName;
        boards[currentItem.key].emoji = newEmoji;
    } else {
        lists[currentItem.key].name = newName;
        lists[currentItem.key].emoji = newEmoji;
    }

    // Save and update UI
    saveData();
    renderLists();
    renderBoards();
    updateTaskListOptions();
    updateKanbanBoardOptions();

    // Reset modal
    resetModal();

    const typeText = isEditingBoard ? 'Board' : 'List';
    showNotification(
        `✅ ${typeText} Updated!`,
        `"${newEmoji} ${newName}" has been updated.`,
        null,
        false
    );

    console.log(`✅ Updated ${isEditingBoard ? 'board' : 'list'}:`, newName);
}

// NEW: Delete list/board functionality
function deleteItem(itemKey, itemType) {
    const item = itemType === 'board' ? boards[itemKey] : lists[itemKey];
    if (!item) return;

    const typeText = itemType === 'board' ? 'board' : 'list';

    if (!confirm(`Delete "${item.emoji} ${item.name}" ${typeText}?\n\nThis will also delete all associated tasks.`)) {
        return;
    }

    if (itemType === 'board') {
        // Remove all kanban tasks associated with this board
        kanbanTasks = kanbanTasks.filter(task => task.board !== itemKey);
        delete boards[itemKey];
        saveKanbanData();
    } else {
        // Remove all tasks associated with this list
        tasks = tasks.filter(task => task.list !== itemKey);
        delete lists[itemKey];
    }

    // Save and update UI
    saveData();
    renderLists();
    renderBoards();
    renderTasks();
    renderKanbanTasks();
    updateTaskListOptions();
    updateKanbanBoardOptions();

    showNotification(
        `🗑️ ${itemType === 'board' ? 'Board' : 'List'} Deleted!`,
        `"${item.emoji} ${item.name}" has been removed.`,
        null,
        false
    );

    console.log(`🗑️ Deleted ${typeText}:`, itemKey);
}

// NEW: Reset modal to creation mode
function resetModal() {
    const listModal = document.getElementById('listModal');
    const modalTitle = document.getElementById('modalTitle');
    const createBtn = document.getElementById('createListBtn');

    currentEditingList = null;
    currentEditingBoard = null;

    if (modalTitle) modalTitle.textContent = 'Create New Item';
    if (createBtn) createBtn.textContent = 'Create';
    if (listModal) listModal.style.display = 'none';

    clearModalInputs();
}

// NEW: Update type selector when modal opens
function updateModalForType(type) {
    const modalTitle = document.getElementById('modalTitle');
    const newItemType = document.getElementById('newItemType');

    if (type === 'board') {
        modalTitle.textContent = 'Create New Board';
        newItemType.value = 'board';
    } else {
        modalTitle.textContent = 'Create New List';
        newItemType.value = 'list';
    }
}

// Setup edit functionality
function setupEditFunctionality() {
    console.log('✏️ Setting up edit functionality...');

    // Edit Task Modal handlers
    const closeEditModal = document.getElementById('closeEditModal');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editTaskModal = document.getElementById('editTaskModal');

    if (closeEditModal) {
        closeEditModal.addEventListener('click', closeEditTaskModal);
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', saveTaskEdit);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditTaskModal);
    }

    // Close modal when clicking outside
    if (editTaskModal) {
        editTaskModal.addEventListener('click', function(e) {
            if (e.target === editTaskModal) {
                closeEditTaskModal();
            }
        });
    }

    // Edit Kanban Modal handlers
    const closeEditKanbanModal = document.getElementById('closeEditKanbanModal');
    const saveKanbanEditBtn = document.getElementById('saveKanbanEditBtn');
    const cancelKanbanEditBtn = document.getElementById('cancelKanbanEditBtn');
    const editKanbanModal = document.getElementById('editKanbanModal');

    if (closeEditKanbanModal) {
        closeEditKanbanModal.addEventListener('click', closeEditKanbanTaskModal);
    }

    if (saveKanbanEditBtn) {
        saveKanbanEditBtn.addEventListener('click', saveKanbanTaskEdit);
    }

    if (cancelKanbanEditBtn) {
        cancelKanbanEditBtn.addEventListener('click', closeEditKanbanTaskModal);
    }

    // Close modal when clicking outside
    if (editKanbanModal) {
        editKanbanModal.addEventListener('click', function(e) {
            if (e.target === editKanbanModal) {
                closeEditKanbanTaskModal();
            }
        });
    }

    console.log('✅ Edit functionality initialized');
}

// Open edit task modal
function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditingTask = task;

    const editTaskModal = document.getElementById('editTaskModal');
    const editTaskName = document.getElementById('editTaskName');
    const editTaskDateTime = document.getElementById('editTaskDateTime');
    const editTaskList = document.getElementById('editTaskList');

    if (editTaskModal && editTaskName && editTaskDateTime && editTaskList) {
        // Populate form with current task data
        editTaskName.value = task.name;
        editTaskDateTime.value = task.due || '';
        editTaskList.value = task.list || 'inbox';

        editTaskModal.style.display = 'flex';

        // Focus on name input
        setTimeout(() => editTaskName.focus(), 100);

        console.log('✏️ Opened edit modal for task:', task.name);
    }
}

// Save task edit
function saveTaskEdit() {
    if (!currentEditingTask) return;

    const editTaskName = document.getElementById('editTaskName');
    const editTaskDateTime = document.getElementById('editTaskDateTime');
    const editTaskList = document.getElementById('editTaskList');

    if (!editTaskName || !editTaskName.value.trim()) {
        alert('Please enter a task name');
        return;
    }

    // Update task
    currentEditingTask.name = editTaskName.value.trim();
    currentEditingTask.due = editTaskDateTime.value || null;
    currentEditingTask.list = editTaskList.value;

    // Save and re-render
    saveData();
    renderTasks();
    scheduleAllNotifications();

    closeEditTaskModal();

    console.log('✅ Task updated:', currentEditingTask.name);
}

// Close edit task modal
function closeEditTaskModal() {
    const editTaskModal = document.getElementById('editTaskModal');
    if (editTaskModal) {
        editTaskModal.style.display = 'none';
        currentEditingTask = null;
    }
}

// Open edit kanban task modal
function openEditKanbanTaskModal(taskId) {
    const task = kanbanTasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditingKanbanTask = task;

    const editKanbanModal = document.getElementById('editKanbanModal');
    const editKanbanTaskName = document.getElementById('editKanbanTaskName');
    const editKanbanTaskBoard = document.getElementById('editKanbanTaskBoard');

    if (editKanbanModal && editKanbanTaskName) {
        // Populate form with current task data
        editKanbanTaskName.value = task.name;
        if (editKanbanTaskBoard) {
            editKanbanTaskBoard.value = task.board || 'main';
        }

        editKanbanModal.style.display = 'flex';

        // Focus on name input
        setTimeout(() => editKanbanTaskName.focus(), 100);

        console.log('✏️ Opened edit modal for kanban task:', task.name);
    }
}

// Save kanban task edit
function saveKanbanTaskEdit() {
    if (!currentEditingKanbanTask) return;

    const editKanbanTaskName = document.getElementById('editKanbanTaskName');
    const editKanbanTaskBoard = document.getElementById('editKanbanTaskBoard');

    if (!editKanbanTaskName || !editKanbanTaskName.value.trim()) {
        alert('Please enter a task name');
        return;
    }

    // Update task
    currentEditingKanbanTask.name = editKanbanTaskName.value.trim();
    if (editKanbanTaskBoard) {
        currentEditingKanbanTask.board = editKanbanTaskBoard.value;
    }

    // Save and re-render
    saveKanbanData();
    renderKanbanTasks();

    closeEditKanbanTaskModal();

    console.log('✅ Kanban task updated:', currentEditingKanbanTask.name);
}

// Close edit kanban task modal
function closeEditKanbanTaskModal() {
    const editKanbanModal = document.getElementById('editKanbanModal');
    if (editKanbanModal) {
        editKanbanModal.style.display = 'none';
        currentEditingKanbanTask = null;
    }
}

// Setup kanban functionality
function setupKanbanFunctionality() {
    console.log('📋 Setting up kanban functionality...');

    const kanbanTaskInput = document.getElementById('kanbanTaskInput');
    const addKanbanTaskBtn = document.getElementById('addKanbanTaskBtn');

    if (kanbanTaskInput && addKanbanTaskBtn) {
        // Add task button click
        addKanbanTaskBtn.addEventListener('click', addKanbanTask);

        // Enter key in input
        kanbanTaskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addKanbanTask();
            }
        });
    }

    console.log('✅ Kanban functionality initialized');
}

// UPDATED: Add kanban task to specific board
function addKanbanTask() {
    const kanbanTaskInput = document.getElementById('kanbanTaskInput');
    const kanbanBoard = document.getElementById('kanbanBoard');

    if (!kanbanTaskInput) return;

    const taskName = kanbanTaskInput.value.trim();
    if (!taskName) return;

    const selectedBoard = kanbanBoard ? kanbanBoard.value : 'main';

    const newKanbanTask = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: taskName,
        status: 'backlog', // Start in backlog
        board: selectedBoard,
        created: new Date().toISOString()
    };

    kanbanTasks.push(newKanbanTask);
    saveKanbanData();
    renderKanbanTasks();

    // Clear input
    kanbanTaskInput.value = '';

    console.log('✅ Kanban task added:', taskName, 'to board:', selectedBoard);
}

// UPDATED: Render kanban tasks filtered by current board
function renderKanbanTasks() {
    console.log('🎨 Rendering kanban tasks...');

    // Get current board
    const activeBoard = currentBoard || 'main';

    // Clear all columns
    const columns = ['backlog', 'todo', 'doing', 'done'];
    columns.forEach(status => {
        const column = document.getElementById(status + 'Column');
        if (column) {
            column.innerHTML = '';
        }
    });

    // Filter tasks by current board
    const boardTasks = kanbanTasks.filter(task => task.board === activeBoard);

    // Render tasks by status
    boardTasks.forEach(task => {
        const column = document.getElementById(task.status + 'Column');
        if (column) {
            const taskEl = document.createElement('div');
            taskEl.className = 'kanban-task';
            taskEl.draggable = true;
            taskEl.dataset.taskId = task.id;

            taskEl.innerHTML = `
                <div class="task-name ${task.completed ? 'completed' : ''}">${task.name}</div>
                <div class="kanban-task-actions">
                    <button class="kanban-task-action" onclick="openEditKanbanTaskModal('${task.id}')" title="Edit task">✏️</button>
                    <button class="kanban-task-action" onclick="deleteKanbanTask('${task.id}')" title="Delete task">🗑️</button>
                </div>
            `;

            // Add drag listeners
            taskEl.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', task.id);
                taskEl.classList.add('dragging');
            });

            taskEl.addEventListener('dragend', function() {
                taskEl.classList.remove('dragging');
            });

            column.appendChild(taskEl);
        }
    });

    // Update task counts
    updateKanbanCounts();

    // Setup drop zones
    setupDropZones();

    console.log('✅ Kanban tasks rendered for board:', activeBoard);
}

// UPDATED: Update kanban task counts for current board
function updateKanbanCounts() {
    const activeBoard = currentBoard || 'main';
    const columns = ['backlog', 'todo', 'doing', 'done'];
    columns.forEach(status => {
        const count = kanbanTasks.filter(task => task.board === activeBoard && task.status === status).length;
        const countEl = document.getElementById(status + 'Count');
        if (countEl) {
            countEl.textContent = count;
        }
    });
}

// Setup drop zones for kanban
function setupDropZones() {
    const columns = document.querySelectorAll('.column-content');

    columns.forEach(column => {
        column.addEventListener('dragover', function(e) {
            e.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', function() {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', function(e) {
            e.preventDefault();
            column.classList.remove('drag-over');

            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = column.id.replace('Column', '');

            moveKanbanTask(taskId, newStatus);
        });
    });
}

// Move kanban task between columns
function moveKanbanTask(taskId, newStatus) {
    const task = kanbanTasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        saveKanbanData();
        renderKanbanTasks();
        console.log('📋 Moved task to:', newStatus);
    }
}

// Delete kanban task
function deleteKanbanTask(taskId) {
    if (confirm('Delete this task?')) {
        kanbanTasks = kanbanTasks.filter(t => t.id !== taskId);
        saveKanbanData();
        renderKanbanTasks();
        console.log('🗑️ Deleted kanban task:', taskId);
    }
}

// Save kanban data
function saveKanbanData() {
    try {
        localStorage.setItem('kanbanTasks', JSON.stringify(kanbanTasks));
        console.log('💾 Kanban data saved');
    } catch (error) {
        console.error('❌ Error saving kanban data:', error);
    }
}

// Load kanban data
function loadKanbanData() {
    try {
        kanbanTasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
        // Migrate old tasks to have board property
        kanbanTasks.forEach(task => {
            if (!task.board) {
                task.board = 'main';
            }
        });
        console.log('📊 Kanban data loaded:', kanbanTasks.length, 'tasks');
    } catch (error) {
        console.error('❌ Error loading kanban data:', error);
        kanbanTasks = [];
    }
}

// UPDATED: Setup share functionality with type support
function setupShareFunctionality() {
    console.log('🔗 Setting up share functionality...');

    // Handle share button clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('share-btn')) {
            e.stopPropagation();
            const itemName = e.target.getAttribute('data-list') || e.target.getAttribute('data-board');
            const itemType = e.target.getAttribute('data-list') ? 'list' : 'board';
            openShareModal(itemName, itemType);
        }
    });

    // Setup share modal buttons
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const closeShareBtn = document.getElementById('closeShareBtn');
    const closeShareModal = document.getElementById('closeShareModal');

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyShareLink);
    }

    if (closeShareBtn) {
        closeShareBtn.addEventListener('click', closeShareModalHandler);
    }

    if (closeShareModal) {
        closeShareModal.addEventListener('click', closeShareModalHandler);
    }

    console.log('✅ Share functionality initialized');
}

// UPDATED: Open share modal with type support
function openShareModal(itemName, itemType) {
    console.log('🔗 Opening share modal for:', itemType, itemName);

    currentShareList = itemName;
    currentShareType = itemType;

    const shareModal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const shareModalTitle = document.getElementById('shareModalTitle');
    const shareDescription = document.getElementById('shareDescription');

    if (shareModal && shareLink) {
        // Update modal title and description
        const typeText = itemType === 'board' ? 'Board' : 'List';
        if (shareModalTitle) {
            shareModalTitle.textContent = `Share ${typeText}`;
        }
        if (shareDescription) {
            shareDescription.textContent = `Share this ${typeText.toLowerCase()} with others:`;
        }

        // Generate share URL with type
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?type=${itemType}&shared=${itemName}&ref=tingtong`;

        shareLink.value = shareUrl;
        shareModal.style.display = 'flex';

        // Select the text for easy copying
        shareLink.select();
        shareLink.setSelectionRange(0, 99999); // For mobile devices

        console.log('📋 Share URL generated:', shareUrl);
    }
}

// Close share modal handler
function closeShareModalHandler() {
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
        shareModal.style.display = 'none';
        currentShareList = null;
        currentShareType = null;
    }
}

// Copy share link
async function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    const copyBtn = document.getElementById('copyLinkBtn');

    if (!shareLink || !copyBtn) return;

    try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareLink.value);
            console.log('📋 Link copied using Clipboard API');
        } else {
            // Fallback for older browsers
            shareLink.select();
            shareLink.setSelectionRange(0, 99999);
            document.execCommand('copy');
            console.log('📋 Link copied using execCommand');
        }

        // Visual feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✅';
        copyBtn.classList.add('copied');

        // Show success notification
        showCopySuccess();

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('copied');
        }, 2000);

    } catch (err) {
        console.error('❌ Failed to copy link:', err);
        alert('Failed to copy link. Please copy it manually.');
    }
}

// Show copy success notification
function showCopySuccess() {
    const notification = document.createElement('div');
    notification.className = 'copy-success';
    notification.textContent = '✅ Link copied to clipboard!';

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Mobile menu functionality
function initializeMobileMenu() {
    console.log('📱 Setting up mobile menu...');

    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileViewToggle = document.getElementById('mobileViewToggle');
    const desktopViewToggle = document.getElementById('viewToggle');

    // Mobile hamburger menu toggle
    if (mobileMenuToggle && sidebar && sidebarOverlay) {
        mobileMenuToggle.addEventListener('click', function() {
            toggleMobileMenu();
        });

        // Close menu when clicking overlay
        sidebarOverlay.addEventListener('click', function() {
            closeMobileMenu();
        });

        // Close menu when clicking navigation items on mobile
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    setTimeout(closeMobileMenu, 150);
                }
            });
        });
    }

    // Sync mobile and desktop view toggles
    if (mobileViewToggle && desktopViewToggle) {
        mobileViewToggle.addEventListener('click', function() {
            desktopViewToggle.click();
            syncViewToggleText();
        });

        desktopViewToggle.addEventListener('click', function() {
            setTimeout(syncViewToggleText, 100);
        });
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && isMobileMenuOpen) {
            closeMobileMenu();
        }
    });

    // Prevent body scroll when mobile menu is open
    function preventBodyScroll(prevent) {
        if (prevent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    function toggleMobileMenu() {
        if (isMobileMenuOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    function openMobileMenu() {
        isMobileMenuOpen = true;
        mobileMenuToggle.classList.add('active');
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        preventBodyScroll(true);
        console.log('📱 Mobile menu opened');
    }

    function closeMobileMenu() {
        isMobileMenuOpen = false;
        mobileMenuToggle.classList.remove('active');
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        preventBodyScroll(false);
        console.log('📱 Mobile menu closed');
    }

    function syncViewToggleText() {
        const desktopText = desktopViewToggle.querySelector('.toggle-text');
        const mobileText = mobileViewToggle.querySelector('.mobile-toggle-text');
        if (mobileText && desktopText) {
            mobileText.textContent = desktopText.textContent;
        }
    }

    // Handle escape key to close mobile menu and modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (isMobileMenuOpen) {
                closeMobileMenu();
            }
            // Also close modals if open
            if (document.getElementById('shareModal').style.display === 'flex') {
                closeShareModalHandler();
            }
            if (document.getElementById('listModal').style.display === 'flex') {
                resetModal();
            }
            if (document.getElementById('editTaskModal').style.display === 'flex') {
                closeEditTaskModal();
            }
            if (document.getElementById('editKanbanModal').style.display === 'flex') {
                closeEditKanbanTaskModal();
            }
        }
    });

    // Initialize sync
    setTimeout(syncViewToggleText, 100);

    console.log('✅ Mobile menu initialized');
}

// Setup background monitoring for when user switches tabs
function setupBackgroundMonitoring() {
    console.log('👁️ Setting up background monitoring...');

    // Track visibility changes
    document.addEventListener('visibilitychange', function() {
        isAppVisible = !document.hidden;
        console.log('👁️ App visibility changed:', isAppVisible ? 'visible' : 'hidden');

        if (isAppVisible) {
            // When user returns to tab, reschedule notifications and restore missed ones
            console.log('🔄 User returned to tab, checking for missed notifications...');
            restoreNotificationState();
            scheduleAllNotifications();
        } else {
            // When user leaves tab, save current state
            saveNotificationState();
        }
    });

    // Handle page focus/blur
    window.addEventListener('focus', function() {
        console.log('🎯 Window focused');
        isAppVisible = true;
        scheduleAllNotifications();
    });

    window.addEventListener('blur', function() {
        console.log('😴 Window blurred - entering background mode');
        isAppVisible = false;
    });

    // Handle browser close/refresh - save any pending notifications
    window.addEventListener('beforeunload', function() {
        console.log('💾 Saving state before page unload...');
        saveNotificationState();
    });
}

// Start background monitoring interval
function startBackgroundMonitoring() {
    // Check for overdue tasks every 30 seconds, even in background
    backgroundCheckInterval = setInterval(function() {
        checkOverdueTasks(true); // Force check even in background
    }, 30000);

    console.log('⏰ Background monitoring started (30s intervals)');
}

// Save notification state to localStorage
function saveNotificationState() {
    const notificationState = {
        scheduledNotifications: [],
        lastCheck: Date.now()
    };

    // Save which tasks have scheduled notifications
    activeTimeouts.forEach((timeoutId, taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.due) {
            notificationState.scheduledNotifications.push({
                taskId: taskId,
                dueTime: new Date(task.due).getTime()
            });
        }
    });

    localStorage.setItem('notificationState', JSON.stringify(notificationState));
    console.log('💾 Notification state saved');
}

// Restore notification state from localStorage
function restoreNotificationState() {
    try {
        const savedState = localStorage.getItem('notificationState');
        if (!savedState) return;

        const state = JSON.parse(savedState);
        const now = Date.now();

        console.log('🔄 Restoring notification state...');

        // Check if any notifications were missed while away
        state.scheduledNotifications.forEach(notification => {
            if (notification.dueTime <= now && notification.dueTime > state.lastCheck) {
                const task = tasks.find(t => t.id === notification.taskId);
                if (task && !task.completed && !task.notified) {
                    console.log('⚠️ Found missed notification:', task.name);
                    triggerTaskNotification(task, true); // Mark as overdue
                }
            }
        });

        // Clean up
        localStorage.removeItem('notificationState');
    } catch (error) {
        console.error('❌ Error restoring notification state:', error);
    }
}

// Setup ringtones using Web Audio API
function setupRingtones() {
    try {
        console.log('🔊 Setting up ringtones...');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Bell sound (800Hz)
        ringtoneLibrary.bell = createTone(audioContext, 800, 1.0);

        // Chime sound (600Hz)  
        ringtoneLibrary.chime = createTone(audioContext, 600, 1.2);

        // Notification sound (1000Hz)
        ringtoneLibrary.notification = createTone(audioContext, 1000, 0.8);

        console.log('✅ Ringtones created successfully');
    } catch (error) {
        console.log('⚠️ Web Audio API not supported:', error);
    }
}

// Create tone using Web Audio API
function createTone(audioContext, frequency, duration) {
    return {
        play: () => {
            try {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);

                console.log('🔊 Playing tone:', frequency + 'Hz', '(background mode:', !isAppVisible, ')');
            } catch (error) {
                console.log('❌ Error playing tone:', error);
            }
        }
    };
}

// Play ringtone with background support
function playRingtone(name, customSrc) {
    console.log('🔊 Playing ringtone:', name || 'custom', '(background:', !isAppVisible, ')');

    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    if (customSrc) {
        // Play custom uploaded ringtone
        currentAudio = new Audio(customSrc);
        currentAudio.volume = isAppVisible ? 0.7 : 0.5; // Lower volume in background
        currentAudio.play().catch(e => console.log('❌ Custom audio play failed:', e));
    } else if (ringtoneLibrary[name]) {
        // Play generated ringtone
        ringtoneLibrary[name].play();
    }
}

// Request notification permission properly
async function requestNotificationPermission() {
    console.log('🔔 Requesting notification permission...');

    if (!('Notification' in window)) {
        console.log('❌ Browser does not support notifications');
        notificationPermission = 'unsupported';
        return false;
    }

    notificationPermission = Notification.permission;
    console.log('Current permission:', notificationPermission);

    if (notificationPermission === 'default') {
        try {
            // Show a friendly prompt first
            const userWants = confirm(
                'Ting Tong can send you task reminders!\n\n' +
                '🔔 Get notified when tasks are due\n' +
                '📱 Works even when browsing other sites\n' +
                '⏰ Never miss important deadlines\n\n' +
                'Enable notifications?'
            );

            if (userWants) {
                // Request permission
                const permission = await Notification.requestPermission();
                notificationPermission = permission;
                console.log('✅ Permission result:', permission);

                if (permission === 'granted') {
                    // Test notification
                    showNotification(
                        'Notifications Enabled! 🎉', 
                        'You will now receive task reminders.',
                        null,
                        false
                    );
                    return true;
                } else {
                    console.log('❌ Permission denied');
                    alert('Notifications were blocked. You can enable them later in your browser settings.');
                    return false;
                }
            } else {
                console.log('ℹ️ User declined notifications');
                return false;
            }
        } catch (error) {
            console.error('❌ Error requesting permission:', error);
            return false;
        }
    } else if (notificationPermission === 'granted') {
        console.log('✅ Notifications already enabled');
        return true;
    } else if (notificationPermission === 'denied') {
        console.log('❌ Notifications previously denied');
        return false;
    }

    return notificationPermission === 'granted';
}

// Show notification with better error handling
function showNotification(title, body, icon = null, urgent = false) {
    console.log('🔔 Showing notification:', title, '(Permission:', notificationPermission, ')');

    let notificationShown = false;

    // Method 1: Browser notifications
    if (notificationPermission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: body,
                icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
                requireInteraction: urgent,
                tag: 'ting-tong-' + Date.now(),
                timestamp: Date.now(),
                silent: false
            });

            console.log('✅ Browser notification created');
            notificationShown = true;

            // Handle clicks
            notification.onclick = function() {
                console.log('👆 Notification clicked');
                window.focus();
                notification.close();
            };

            // Auto-close after timeout
            setTimeout(() => {
                try {
                    notification.close();
                } catch (e) {
                    // Ignore close errors
                }
            }, urgent ? 15000 : 8000);

        } catch (error) {
            console.error('❌ Browser notification failed:', error);
            notificationShown = false;
        }
    }

    // Method 2: In-page notification (fallback or supplemental)
    if (isAppVisible || !notificationShown) {
        showInPageNotification(title, body, urgent);
    }

    return notificationShown;
}

// In-page notification fallback
function showInPageNotification(title, body, urgent = false) {
    console.log('📄 Showing in-page notification');

    const notification = document.createElement('div');
    notification.className = 'in-page-notification' + (urgent ? ' urgent' : '');
    notification.innerHTML = `
        <div class="notification-header">${urgent ? '🚨' : '🔔'} ${title}</div>
        <div class="notification-body">${body}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    const styles = urgent ? `
        position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 350px;
        background: linear-gradient(135deg, #ef4444, #dc2626) !important;
        color: white; padding: 16px 20px; border-radius: 12px;
        animation: slideInRight 0.3s ease, pulse 1s infinite;
        border: 2px solid #fef2f2; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
    ` : `
        position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 350px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white; padding: 16px 20px; border-radius: 12px;
        animation: slideInRight 0.3s ease;
    `;

    notification.style.cssText = styles;

    // Add animation styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            .in-page-notification .notification-header {
                font-weight: 600; margin-bottom: 8px; font-size: 16px;
            }
            .in-page-notification .notification-body {
                font-size: 14px; opacity: 0.9; line-height: 1.4;
            }
            .in-page-notification .notification-close {
                position: absolute; top: 8px; right: 12px; background: none; border: none;
                color: white; font-size: 20px; cursor: pointer; opacity: 0.7;
                width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
            }
            .in-page-notification .notification-close:hover {
                opacity: 1; background: rgba(255,255,255,0.1); border-radius: 50%;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, urgent ? 12000 : 6000);
}

// Trigger task notification
function triggerTaskNotification(task, isOverdue = false) {
    const title = isOverdue ? `⚠️ Overdue: ${task.name}` : `⏰ Due Now: ${task.name}`;
    const body = task.due ? 
        (isOverdue ? `Was due: ${new Date(task.due).toLocaleString()}` : `Due: ${new Date(task.due).toLocaleString()}`) :
        'Task reminder';

    console.log('🚨 Triggering notification:', title);

    // Play ringtone first
    if (task.ringtone && task.ringtone !== '') {
        console.log('🔊 Playing ringtone for notification:', task.ringtone);
        playRingtone(task.ringtone, task.customSrc);
    }

    // Show notification
    showNotification(title, body, null, isOverdue);

    // Mark as notified
    task.notified = true;
    saveData();
    renderTasks(); // Update UI to show notified state
}

// Schedule task notification
function scheduleTaskNotification(task) {
    if (!task.due || task.completed || task.notified) return;

    const dueTime = new Date(task.due).getTime();
    const now = Date.now();
    const timeDiff = dueTime - now;

    console.log(`⏰ Scheduling notification for "${task.name}" in ${Math.round(timeDiff/1000)} seconds`);

    if (timeDiff > 0) {
        // Clear existing timeout
        if (activeTimeouts.has(task.id)) {
            clearTimeout(activeTimeouts.get(task.id));
        }

        // Schedule notification
        const timeoutId = setTimeout(() => {
            console.log(`🚨 Task notification triggered: ${task.name}`);
            triggerTaskNotification(task, false);
            activeTimeouts.delete(task.id);
        }, timeDiff);

        activeTimeouts.set(task.id, timeoutId);
        console.log(`✅ Notification scheduled for: ${task.name} at ${new Date(task.due).toLocaleString()}`);
    } else if (timeDiff > -300000) { // Overdue by less than 5 minutes
        console.log(`⚠️ Task is recently overdue: ${task.name}`);
        triggerTaskNotification(task, true);
    }
}

// Schedule all notifications
function scheduleAllNotifications() {
    console.log('⏰ Scheduling all notifications...');

    // Clear existing timeouts
    activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    activeTimeouts.clear();

    // Schedule for all pending tasks
    let scheduledCount = 0;
    tasks.forEach(task => {
        if (!task.completed && !task.notified && task.due) {
            scheduleTaskNotification(task);
            scheduledCount++;
        }
    });

    console.log(`✅ Scheduled ${scheduledCount} notifications`);
    saveNotificationState();
}

// Check for overdue tasks
function checkOverdueTasks(forceCheck = false) {
    if (!forceCheck && isAppVisible) return;

    const now = Date.now();
    let foundOverdue = false;

    tasks.forEach(task => {
        if (task.due && !task.completed && !task.notified) {
            const dueTime = new Date(task.due).getTime();
            if (now >= dueTime) {
                console.log('🚨 Found overdue task:', task.name);
                triggerTaskNotification(task, true);
                foundOverdue = true;
            }
        }
    });

    if (foundOverdue) {
        saveData();
    }
}

// Setup ringtone handlers
function setupRingtoneHandlers() {
    const taskRingtone = document.getElementById('taskRingtone');
    const customRingtoneInput = document.getElementById('customRingtone');

    if (taskRingtone) {
        taskRingtone.addEventListener('change', function() {
            const selectedValue = this.value;
            console.log('🔊 Ringtone selected:', selectedValue);

            if (selectedValue === 'custom') {
                if (customRingtoneInput) {
                    customRingtoneInput.style.display = 'block';
                    customRingtoneInput.click();
                }
            } else if (selectedValue === '') {
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }
            } else {
                // Play preview
                playRingtone(selectedValue);
            }
        });
    }

    if (customRingtoneInput) {
        customRingtoneInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                if (!file.type.startsWith('audio/')) {
                    alert('Please select an audio file');
                    taskRingtone.value = '';
                    return;
                }

                const fileURL = URL.createObjectURL(file);
                playRingtone(null, fileURL);

                // Update dropdown
                taskRingtone.innerHTML = `
                    <option value="">No ringtone</option>
                    <option value="bell">Bell</option>
                    <option value="chime">Chime</option>
                    <option value="notification">Notification</option>
                    <option value="custom" selected>Custom: ${file.name}</option>
                `;
            }
        });
    }
}

// FIXED: Load data with proper emoji defaults
function loadData() {
    try {
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];

        // Load or create default lists and boards with proper emojis
        lists = JSON.parse(localStorage.getItem('lists')) || {};
        boards = JSON.parse(localStorage.getItem('boards')) || {};

        // Ensure default lists exist with emojis
        if (!lists.inbox) lists.inbox = { name: 'Inbox', emoji: '📥', mode: 'list', shared: false };
        if (!lists.work) lists.work = { name: 'Work', emoji: '💼', mode: 'list', shared: false };
        if (!lists.personal) lists.personal = { name: 'Personal', emoji: '🏠', mode: 'list', shared: false };
        if (!lists.welcome) lists.welcome = { name: 'Welcome', emoji: '👋', mode: 'list', shared: false };
        if (!lists.shilpha) lists.shilpha = { name: 'Shilpha', emoji: '💜', mode: 'list', shared: false };

        // Ensure default board exists with emoji
        if (!boards.main) boards.main = { name: 'Main Board', emoji: '🗂️', mode: 'board', shared: false };

        // Fix any existing items missing emojis
        Object.keys(lists).forEach(key => {
            if (!lists[key].emoji) lists[key].emoji = '📋';
        });
        Object.keys(boards).forEach(key => {
            if (!boards[key].emoji) boards[key].emoji = '🗂️';
        });

        // Load kanban data
        loadKanbanData();

        console.log('📊 Data loaded:', tasks.length, 'tasks,', Object.keys(lists).length, 'lists,', Object.keys(boards).length, 'boards,', kanbanTasks.length, 'kanban tasks');
    } catch (error) {
        console.error('❌ Error loading data:', error);
    }
}

// UPDATED: Save data including boards
function saveData() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('lists', JSON.stringify(lists));
        localStorage.setItem('boards', JSON.stringify(boards));
    } catch (error) {
        console.error('❌ Error saving data:', error);
    }
}

// UPDATED: Setup navigation with boards support
function setupNavigation() {
    console.log('🧭 Setting up navigation...');

    // Main navigation items (All, Today, etc.)
    const mainNavItems = document.querySelectorAll('.nav-list .nav-item[data-filter]');

    mainNavItems.forEach(item => {
        const filter = item.getAttribute('data-filter');

        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔄 Navigation clicked:', filter);

            setActiveNavItem(item);
            applyFilter(filter);
        });
    });

    // Custom list navigation
    document.addEventListener('click', function(e) {
        const listItem = e.target.closest('.nav-item[data-list]');
        const boardItem = e.target.closest('.nav-item[data-board]');

        if (listItem && !e.target.classList.contains('share-btn') && !e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
            const listName = listItem.getAttribute('data-list');
            console.log('🔄 List clicked:', listName);

            e.preventDefault();
            setActiveNavItem(listItem);
            applyFilter('list', listName);
        } else if (boardItem && !e.target.classList.contains('share-btn') && !e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
            const boardName = boardItem.getAttribute('data-board');
            console.log('🔄 Board clicked:', boardName);

            e.preventDefault();
            setActiveNavItem(boardItem);
            applyFilter('board', boardName);
        }
    });
}

// Set active navigation item
function setActiveNavItem(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

// UPDATED: Apply filter with board support
function applyFilter(filter, itemName = null) {
    console.log('🔍 Applying filter:', filter, itemName || '');

    currentFilter = filter;

    if (filter === 'list') {
        currentList = itemName;
        currentBoard = null;
    } else if (filter === 'board') {
        currentBoard = itemName;
        currentList = null;
        // Switch to kanban view when selecting a board
        switchToKanbanView();
    } else {
        currentList = null;
        currentBoard = null;
    }

    hideSummary();

    if (filter === 'summary') {
        showSummary();
    } else if (filter === 'board') {
        showKanbanView();
        renderKanbanTasks();
    } else {
        showTaskView();
        renderTasks();
    }
}

// Switch to Kanban view programmatically
function switchToKanbanView() {
    const listView = document.getElementById('listView');
    const kanbanView = document.getElementById('kanbanView');
    const listTaskInput = document.getElementById('listTaskInput');
    const toggleText = document.querySelector('.toggle-text');
    const listsSection = document.getElementById('listsSection');
    const boardsSection = document.getElementById('boardsSection');

    if (listView && kanbanView && listTaskInput && toggleText) {
        listView.style.display = 'none';
        kanbanView.style.display = 'block';
        listTaskInput.style.display = 'none';
        toggleText.textContent = 'Kanban';

        if (listsSection) listsSection.style.display = 'none';
        if (boardsSection) boardsSection.style.display = 'block';
    }
}

// Show task view
function showTaskView() {
    const listView = document.getElementById('listView');
    const kanbanView = document.getElementById('kanbanView');
    const listTaskInput = document.getElementById('listTaskInput');
    const listsSection = document.getElementById('listsSection');
    const boardsSection = document.getElementById('boardsSection');

    if (listView && kanbanView && listTaskInput) {
        listView.style.display = 'block';
        kanbanView.style.display = 'none';
        listTaskInput.style.display = 'block';

        if (listsSection) listsSection.style.display = 'block';
        if (boardsSection) boardsSection.style.display = 'none';
    }
}

// Show Kanban view
function showKanbanView() {
    const listView = document.getElementById('listView');
    const kanbanView = document.getElementById('kanbanView');
    const listTaskInput = document.getElementById('listTaskInput');
    const listsSection = document.getElementById('listsSection');
    const boardsSection = document.getElementById('boardsSection');

    if (listView && kanbanView && listTaskInput) {
        listView.style.display = 'none';
        kanbanView.style.display = 'block';
        listTaskInput.style.display = 'none';

        if (listsSection) listsSection.style.display = 'none';
        if (boardsSection) boardsSection.style.display = 'block';
    }
}

// Filter tasks based on current filter
function getFilteredTasks() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let filtered = [...tasks];

    switch (currentFilter) {
        case 'all':
            break;
        case 'today':
            filtered = filtered.filter(task => {
                if (!task.due) return false;
                const taskDate = new Date(task.due);
                return taskDate >= today && taskDate < tomorrow;
            });
            break;
        case 'week':
            filtered = filtered.filter(task => {
                if (!task.due) return false;
                const taskDate = new Date(task.due);
                return taskDate >= today && taskDate <= nextWeek;
            });
            break;
        case 'inbox':
            filtered = filtered.filter(task => task.list === 'inbox');
            break;
        case 'list':
            if (currentList) {
                filtered = filtered.filter(task => task.list === currentList);
            }
            break;
    }

    return filtered;
}

// Show summary
function showSummary() {
    console.log('📊 Showing summary...');

    const listView = document.getElementById('listView');
    const kanbanView = document.getElementById('kanbanView');
    const listTaskInput = document.getElementById('listTaskInput');
    const listsSection = document.getElementById('listsSection');
    const boardsSection = document.getElementById('boardsSection');

    if (listView) listView.style.display = 'none';
    if (kanbanView) kanbanView.style.display = 'none';
    if (listTaskInput) listTaskInput.style.display = 'none';
    if (listsSection) listsSection.style.display = 'block';
    if (boardsSection) boardsSection.style.display = 'none';

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = tasks.filter(task => {
        if (!task.due || task.completed) return false;
        return new Date(task.due) < new Date();
    }).length;

    const totalKanbanTasks = kanbanTasks.length;
    const doneKanbanTasks = kanbanTasks.filter(t => t.status === 'done').length;

    const summaryHTML = `
        <div class="summary-view">
            <h2>📊 Task Summary</h2>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-number">${totalTasks}</div>
                    <div class="stat-label">List Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${pendingTasks}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completedTasks}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card ${overdueTasks > 0 ? 'overdue' : ''}">
                    <div class="stat-number">${overdueTasks}</div>
                    <div class="stat-label">Overdue</div>
                </div>
            </div>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-number">${Object.keys(lists).length}</div>
                    <div class="stat-label">Lists</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Object.keys(boards).length}</div>
                    <div class="stat-label">Boards</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalKanbanTasks}</div>
                    <div class="stat-label">Kanban Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${doneKanbanTasks}</div>
                    <div class="stat-label">Kanban Done</div>
                </div>
            </div>
            <div class="lists-breakdown">
                <h3>Tasks by List:</h3>
                ${Object.entries(lists).map(([key, list]) => {
                    const count = tasks.filter(t => t.list === key).length;
                    return `<div class="list-stat">${list.emoji} ${list.name}: ${count} tasks</div>`;
                }).join('')}

                <h3 style="margin-top: 20px;">Tasks by Board:</h3>
                ${Object.entries(boards).map(([key, board]) => {
                    const count = kanbanTasks.filter(t => t.board === key).length;
                    return `<div class="list-stat">${board.emoji} ${board.name}: ${count} tasks</div>`;
                }).join('')}
            </div>
            <div class="background-info">
                <h3>📱 App Features</h3>
                <p><strong>Notifications:</strong> ${notificationPermission === 'granted' ? '✅ Enabled' : '❌ Disabled'}</p>
                <p><strong>Share Lists/Boards:</strong> ✅ Click 🔗 to share (auto-adds to receiver's app)</p>
                <p><strong>Edit Tasks:</strong> ✅ Click ✏️ to edit tasks</p>
                <p><strong>Edit Lists/Boards:</strong> ✅ Click ✏️ to edit lists and boards</p>
                <p><strong>Delete Lists/Boards:</strong> ✅ Click 🗑️ to delete with confirmation</p>
                <p><strong>Create Items:</strong> ✅ Click + button with emoji picker</p>
                <p><strong>View Separation:</strong> ✅ Lists for List view, Boards for Kanban view</p>
                <p><strong>Mobile Menu:</strong> ${window.innerWidth <= 768 ? '✅ Active' : '🖥️ Desktop Mode'}</p>
                ${notificationPermission !== 'granted' ? '<p><em>💡 Refresh page to enable notifications</em></p>' : ''}
            </div>
        </div>
    `;

    hideSummary();

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const firstChild = mainContent.firstElementChild;
        if (firstChild) {
            firstChild.insertAdjacentHTML('afterend', summaryHTML);
        }
    }
}

// Hide summary
function hideSummary() {
    const summary = document.querySelector('.summary-view');
    if (summary) summary.remove();
}

// Render tasks WITH EDIT BUTTONS instead of sound buttons
function renderTasks() {
    console.log('🎨 Rendering tasks...');

    const tasksToShow = getFilteredTasks();

    const taskContainers = [
        document.getElementById('overdueTasks'),
        document.getElementById('todayTasks'),
        document.getElementById('noDateTasks'),
        document.getElementById('completedTasks')
    ];

    taskContainers.forEach(container => {
        if (container) container.innerHTML = '';
    });

    const now = new Date();
    const sections = { overdue: [], today: [], noDate: [], completed: [] };

    tasksToShow.forEach(task => {
        if (task.completed) {
            sections.completed.push(task);
        } else if (!task.due) {
            sections.noDate.push(task);
        } else if (new Date(task.due) < now) {
            sections.overdue.push(task);
        } else {
            sections.today.push(task);
        }
    });

    renderTaskSection('overdueTasks', sections.overdue);
    renderTaskSection('todayTasks', sections.today);
    renderTaskSection('noDateTasks', sections.noDate);
    renderTaskSection('completedTasks', sections.completed);

    console.log('✅ Tasks rendered');
}

// Render task section with EDIT buttons instead of speaker buttons
function renderTaskSection(containerId, tasks) {
    const container = document.getElementById(containerId);
    if (!container) return;

    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-item';

        let metaText = task.due ? new Date(task.due).toLocaleString() : '';
        if (task.ringtone && task.ringtone !== '') {
            metaText += task.ringtone === 'custom' ? ' 🔊 Custom' : ` 🔊 ${task.ringtone}`;
        }
        if (task.notified) {
            metaText += ' 🔔 Notified';
        }

        taskEl.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="toggleTask('${task.id}')">                
            </div>
            <div class="task-content">
                <div class="task-name ${task.completed ? 'completed' : ''}">${task.name}</div>
                <div class="task-meta">${metaText}</div>
            </div>
            <div class="task-actions">
                <button class="task-action" onclick="openEditTaskModal('${task.id}')" title="Edit task">✏️</button>
                <button class="task-action" onclick="deleteTask('${task.id}')" title="Delete task">🗑️</button>
            </div>
        `;
        container.appendChild(taskEl);
    });
}

// Toggle task completion
function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        task.notified = false; // Reset notification when toggling

        if (task.completed && activeTimeouts.has(taskId)) {
            clearTimeout(activeTimeouts.get(taskId));
            activeTimeouts.delete(taskId);
        } else if (!task.completed) {
            // Reschedule if uncompleting
            scheduleTaskNotification(task);
        }

        saveData();
        renderTasks();
    }
}

// Delete task
function deleteTask(taskId) {
    if (confirm('Delete this task?')) {
        if (activeTimeouts.has(taskId)) {
            clearTimeout(activeTimeouts.get(taskId));
            activeTimeouts.delete(taskId);
        }

        tasks = tasks.filter(t => t.id !== taskId);
        saveData();
        renderTasks();
    }
}

// Setup task management
function setupTaskManagement() {
    console.log('📝 Setting up task management...');

    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');

    if (addTaskBtn && taskInput) {
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });

        taskInput.addEventListener('focus', function() {
            const options = document.getElementById('taskOptions');
            if (options) options.style.display = 'grid';
        });
    }

    updateTaskListOptions();
    updateKanbanBoardOptions();
}

// Add new task with notification scheduling
function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskDateTime = document.getElementById('taskDateTime');
    const taskListSelect = document.getElementById('taskList');
    const taskRingtone = document.getElementById('taskRingtone');
    const customRingtoneInput = document.getElementById('customRingtone');

    if (!taskInput) return;

    const name = taskInput.value.trim();
    if (!name) return;

    const newTask = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: name,
        completed: false,
        due: taskDateTime ? taskDateTime.value : null,
        list: taskListSelect ? taskListSelect.value : 'inbox',
        ringtone: taskRingtone ? taskRingtone.value : '',
        customSrc: null,
        notified: false,
        created: new Date().toISOString()
    };

    // Handle custom ringtone
    if (taskRingtone && taskRingtone.value === 'custom' && customRingtoneInput && customRingtoneInput.files[0]) {
        const file = customRingtoneInput.files[0];
        newTask.customSrc = URL.createObjectURL(file);
    }

    tasks.push(newTask);
    saveData();

    // Schedule notification
    scheduleTaskNotification(newTask);

    renderTasks();

    // Clear inputs
    taskInput.value = '';
    if (taskDateTime) taskDateTime.value = '';
    if (taskRingtone) taskRingtone.value = '';
    if (customRingtoneInput) customRingtoneInput.value = '';

    const taskOptions = document.getElementById('taskOptions');
    if (taskOptions) taskOptions.style.display = 'none';

    console.log('✅ Task added:', name);
}

// UPDATED: Update task list options for lists only
function updateTaskListOptions() {
    const taskListSelect = document.getElementById('taskList');
    const editTaskList = document.getElementById('editTaskList');

    [taskListSelect, editTaskList].forEach(select => {
        if (select) {
            select.innerHTML = '';
            Object.entries(lists).forEach(([key, list]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${list.emoji} ${list.name}`;
                select.appendChild(option);
            });
        }
    });
}

// NEW: Update kanban board options for boards only
function updateKanbanBoardOptions() {
    const kanbanBoard = document.getElementById('kanbanBoard');
    const editKanbanTaskBoard = document.getElementById('editKanbanTaskBoard');

    [kanbanBoard, editKanbanTaskBoard].forEach(select => {
        if (select) {
            select.innerHTML = '';
            Object.entries(boards).forEach(([key, board]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${board.emoji} ${board.name}`;
                select.appendChild(option);
            });
        }
    });
}

// UPDATED: Setup view toggle with section visibility
function setupViewToggle() {
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', function() {
            const listView = document.getElementById('listView');
            const kanbanView = document.getElementById('kanbanView');
            const toggleText = viewToggle.querySelector('.toggle-text');
            const listTaskInput = document.getElementById('listTaskInput');
            const listsSection = document.getElementById('listsSection');
            const boardsSection = document.getElementById('boardsSection');

            if (listView && kanbanView && toggleText && listTaskInput) {
                if (listView.style.display === 'none') {
                    // Switch to List view
                    listView.style.display = 'block';
                    kanbanView.style.display = 'none';
                    listTaskInput.style.display = 'block';
                    toggleText.textContent = 'List';
                    if (listsSection) listsSection.style.display = 'block';
                    if (boardsSection) boardsSection.style.display = 'none';
                    console.log('📋 Switched to List view');
                } else {
                    // Switch to Kanban view  
                    listView.style.display = 'none';
                    kanbanView.style.display = 'block';
                    listTaskInput.style.display = 'none';
                    toggleText.textContent = 'Kanban';
                    if (listsSection) listsSection.style.display = 'none';
                    if (boardsSection) boardsSection.style.display = 'block';
                    renderKanbanTasks();
                    console.log('📋 Switched to Kanban view');
                }
            }
        });
    }
}

// UPDATED: Setup modals with both list and board creation
function setupModals() {
    const addListBtn = document.getElementById('addListBtn');
    const addBoardBtn = document.getElementById('addBoardBtn');
    const listModal = document.getElementById('listModal');
    const closeModal = document.getElementById('closeModal');
    const cancelListBtn = document.getElementById('cancelListBtn');
    const createListBtn = document.getElementById('createListBtn');

    if (addListBtn && listModal) {
        addListBtn.addEventListener('click', () => {
            resetModal();
            updateModalForType('list');
            listModal.style.display = 'flex';
            const newListName = document.getElementById('newListName');
            if (newListName) {
                setTimeout(() => newListName.focus(), 100);
            }
        });
    }

    if (addBoardBtn && listModal) {
        addBoardBtn.addEventListener('click', () => {
            resetModal();
            updateModalForType('board');
            listModal.style.display = 'flex';
            const newListName = document.getElementById('newListName');
            if (newListName) {
                setTimeout(() => newListName.focus(), 100);
            }
        });
    }

    if (closeModal && listModal) {
        closeModal.addEventListener('click', () => {
            resetModal();
        });
    }

    if (cancelListBtn && listModal) {
        cancelListBtn.addEventListener('click', () => {
            resetModal();
        });
    }

    // UPDATED: Create/Save button functionality
    if (createListBtn) {
        createListBtn.addEventListener('click', () => {
            if (currentEditingList || currentEditingBoard) {
                saveEditedItem();
            } else {
                createNewItem();
            }
        });
    }

    // Handle Enter key in name input
    const newListName = document.getElementById('newListName');
    if (newListName) {
        newListName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (currentEditingList || currentEditingBoard) {
                    saveEditedItem();
                } else {
                    createNewItem();
                }
            }
        });
    }

    if (listModal) {
        listModal.addEventListener('click', function(e) {
            if (e.target === listModal) {
                resetModal();
            }
        });
    }
}

// Clear modal inputs
function clearModalInputs() {
    const newListName = document.getElementById('newListName');
    const newItemType = document.getElementById('newItemType');
    const newItemEmoji = document.getElementById('newItemEmoji');

    if (newListName) newListName.value = '';
    if (newItemType) newItemType.value = 'list';
    if (newItemEmoji) newItemEmoji.value = '📋';
}

// FIXED: Render lists in navigation with edit/delete buttons
function renderLists() {
    console.log('📂 Rendering lists...');

    // Update select dropdowns
    updateTaskListOptions();

    // Update lists in sidebar
    const listSection = document.getElementById('listSection');
    if (listSection) {
        // Clear existing lists
        listSection.innerHTML = '';

        // Add lists with proper emojis and action buttons
        Object.entries(lists).forEach(([key, list]) => {
            const listItem = document.createElement('li');
            listItem.className = 'nav-item';
            listItem.setAttribute('data-list', key);
            listItem.innerHTML = `
                <span class="nav-icon">${list.emoji || '📋'}</span>
                <span>${list.name}</span>
                <div class="nav-actions" style="display: flex; gap: 4px; margin-left: auto;">
                    <button class="edit-btn" onclick="editItem('${key}', 'list')" title="Edit ${list.name} list" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px; transition: all 0.2s ease;">✏️</button>
                    <button class="delete-btn" onclick="deleteItem('${key}', 'list')" title="Delete ${list.name} list" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px; transition: all 0.2s ease;">🗑️</button>
                    <button class="share-btn" data-list="${key}" title="Share ${list.name} list" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px; transition: all 0.2s ease;">🔗</button>
                </div>
            `;
            listSection.appendChild(listItem);
        });
    }
}

// NEW: Render boards in navigation with edit/delete buttons
function renderBoards() {
    console.log('📋 Rendering boards...');

    // Update select dropdowns
    updateKanbanBoardOptions();

    // Update boards in sidebar
    const boardSection = document.getElementById('boardSection');
    if (boardSection) {
        // Clear existing boards
        boardSection.innerHTML = '';

        // Add boards with proper emojis and action buttons
        Object.entries(boards).forEach(([key, board]) => {
            const boardItem = document.createElement('li');
            boardItem.className = 'nav-item';
            boardItem.setAttribute('data-board', key);
            boardItem.innerHTML = `
                <span class="nav-icon">${board.emoji || '🗂️'}</span>
                <span>${board.name}</span>
                <div class="nav-actions" style="display: flex; gap: 4px; margin-left: auto;">
                    <button class="edit-btn" onclick="editItem('${key}', 'board')" title="Edit ${board.name} board" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px; transition: all 0.2s ease;">✏️</button>
                    <button class="delete-btn" onclick="deleteItem('${key}', 'board')" title="Delete ${board.name} board" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px; transition: all 0.2s ease;">🗑️</button>
                    <button class="share-btn" data-board="${key}" title="Share ${board.name} board" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px; transition: all 0.2s ease;">🔗</button>
                </div>
            `;
            boardSection.appendChild(boardItem);
        });
    }
}

// Make functions global for onclick handlers
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.playRingtone = playRingtone;
window.openShareModal = openShareModal;
window.closeShareModalHandler = closeShareModalHandler;
window.deleteKanbanTask = deleteKanbanTask;
window.openEditTaskModal = openEditTaskModal;
window.openEditKanbanTaskModal = openEditKanbanTaskModal;
window.createNewItem = createNewItem;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.saveEditedItem = saveEditedItem;

console.log('📜 Complete script loaded with fixed emoji display and list/board management!');
