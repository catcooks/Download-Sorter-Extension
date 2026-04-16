import { DEFAULT_FILE_MAP as STATIC_MAP } from './filemap.js';
// Note: Ensure your storage functions match the names exported from your storage/config module.
import { saveFileMap, getFileMap } from './storage.js'; 

const folderColumn = document.getElementById('folderColumn');
const extensionColumn = document.getElementById('fileExtension');
const addFolderBtn = document.getElementById('addFolderBtn');
const addExtBtn = document.getElementById('addExtBtn');

let CURRENT_MAP = {};

async function init() {
  CURRENT_MAP = await getFileMap(STATIC_MAP);
  
  // Backwards compatibility safety check:
  // If an old flat array exists, convert it to the new structure automatically.
  Object.keys(CURRENT_MAP).forEach(key => {
    if (Array.isArray(CURRENT_MAP[key])) {
      CURRENT_MAP[key] = { type: 'category', rules: [], extensions: CURRENT_MAP[key] };
      saveFileMap(CURRENT_MAP);
    }
  });

  renderFolders();
}

function formatName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// --- UI Component Helpers ---

function createInlineInput(placeholder, onConfirm, onCancel) {
  const wrapper = document.createElement('div');
  wrapper.className = 'folder-wrapper extension-item inline-input-active';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.className = 'folder-btn';
  input.onkeydown = (e) => {
    if (e.key === 'Enter') onConfirm(input.value);
    else if (e.key === 'Escape') onCancel();
  };

  const confirmBtn = createActionButton('✅', 'delete-btn', () => onConfirm(input.value));
  const cancelBtn = createActionButton('❌', 'delete-btn', onCancel);
  
  wrapper.appendChild(input);
  wrapper.appendChild(confirmBtn);
  wrapper.appendChild(cancelBtn);
  setTimeout(() => input.focus(), 10);
  
  return wrapper;
}

function createActionButton(text, className, onClick) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.innerHTML = text;
  if (onClick) btn.onclick = onClick;
  return btn;
}

function createItemWrapper(mainBtn, deleteBtn, className) {
  const wrapper = document.createElement('div');
  wrapper.className = className;
  wrapper.appendChild(mainBtn);
  wrapper.appendChild(deleteBtn);
  return wrapper;
}

// --- Core Rendering Logic ---

function renderFolders() {
  folderColumn.querySelectorAll('.folder-wrapper:not(.plus-btn)').forEach(f => f.remove());
  addFolderBtn.style.display = 'flex';
  
  Object.keys(CURRENT_MAP).forEach(key => {
    const isRuleFolder = CURRENT_MAP[key].type === 'rule';
    const icon = isRuleFolder ? '🎯' : '📁'; // Visually distinguish rule folders from normal categories

    const btn = createActionButton(`${icon} ${formatName(key)}`, 'folder-btn', () => {
      // Reset all icons to closed
      document.querySelectorAll('.folder-btn').forEach(b => {
        b.innerHTML = b.innerHTML.replace('📂', '📁').replace('🧿', '🎯');
      });

      // Set active icon
      btn.innerHTML = btn.innerHTML.replace('📁', '📂').replace('🎯', '🧿');
      renderExtensions(key);
    });

    const delBtn = createActionButton('⛔', 'delete-btn', (e) => {
      e.stopPropagation();
      if (delBtn.innerHTML === '⛔') {
        delBtn.innerHTML = '❓';
        setTimeout(() => { if (delBtn) delBtn.innerHTML = '⛔' }, 3000);
      } else {
        delete CURRENT_MAP[key];
        saveFileMap(CURRENT_MAP); 
        renderFolders();
        extensionColumn.innerHTML = '';
      }
    });

    const wrapper = createItemWrapper(btn, delBtn, 'folder-wrapper');
    folderColumn.insertBefore(wrapper, addFolderBtn);
  });
}

function renderExtensions(key) {
  extensionColumn.innerHTML = '';
  const folderData = CURRENT_MAP[key];
  if (!folderData) return;

  // 1. Render Rules (Site/Name conditions)
  folderData.rules.forEach((rule, index) => {
    const btn = createActionButton(`🌐 ${rule}`, 'folder', null);
    const delBtn = createActionButton('⛔', 'delete-btn', () => {
      if (delBtn.innerHTML === '⛔') {
        delBtn.innerHTML = '❓';
        setTimeout(() => { if (delBtn) delBtn.innerHTML = '⛔' }, 2000);
      } else {
        folderData.rules.splice(index, 1);
        saveFileMap(CURRENT_MAP);
        renderExtensions(key);
      }
    });
    extensionColumn.appendChild(createItemWrapper(btn, delBtn, 'extension-item'));
  });

  // 2. Render File Extensions
  folderData.extensions.forEach((ext, index) => {
    const btn = createActionButton(`.${ext}`, 'folder', null);
    const delBtn = createActionButton('⛔', 'delete-btn', () => {
      if (delBtn.innerHTML === '⛔') {
        delBtn.innerHTML = '❓';
        setTimeout(() => { if (delBtn) delBtn.innerHTML = '⛔' }, 2000);
      } else {
        folderData.extensions.splice(index, 1);
        saveFileMap(CURRENT_MAP);
        renderExtensions(key);
      }
    });
    extensionColumn.appendChild(createItemWrapper(btn, delBtn, 'extension-item'));
  });

  addExtBtn.style.display = 'flex';
  extensionColumn.appendChild(addExtBtn);
  
  // 3. Add Extension Logic (With safe "stealing")
  addExtBtn.onclick = () => {
    const inputRow = createInlineInput("ext (e.g. mp4)...", (val) => {
      if (val) {
        const clean = val.replace('.', '').toLowerCase().trim();
        const targetFolder = CURRENT_MAP[key];

        // Strict Stealing: Only steal if the target is a normal Category
        if (targetFolder.type === 'category') {
          Object.keys(CURRENT_MAP).forEach(folderKey => {
            // Only steal from OTHER category folders, ignore Rule folders
            if (CURRENT_MAP[folderKey].type === 'category') {
              const foundIndex = CURRENT_MAP[folderKey].extensions.indexOf(clean);
              if (foundIndex !== -1) {
                CURRENT_MAP[folderKey].extensions.splice(foundIndex, 1);
              }
            }
          });
        }

        // Add the extension to the current folder
        if (!targetFolder.extensions.includes(clean)) {
          targetFolder.extensions.push(clean);
          saveFileMap(CURRENT_MAP);
        }
      }

      renderExtensions(key);
      renderFolders(); // Refresh to update left column if needed
    }, () => renderExtensions(key));
    
    addExtBtn.style.display = 'none';
    extensionColumn.insertBefore(inputRow, addExtBtn);
  };
}

// --- Menu Navigation ---

const configBtn = document.getElementById('config');
const explorerView = document.getElementById('explorerView');
const rulesView = document.getElementById('rulesView');
const addSiteRuleBtn = document.getElementById('addSiteRule');
const addNameRuleBtn = document.getElementById('addNameRule');

configBtn.onclick = () => {
  configBtn.classList.toggle('active');
  const isConfigActive = configBtn.classList.contains('active');
  
  explorerView.style.display = isConfigActive ? 'none' : 'flex';
  rulesView.style.display = isConfigActive ? 'flex' : 'none';

  if (isConfigActive) {
    extensionColumn.innerHTML = '';
    renderRulesView();
  } else {
    renderFolders();
  }
};

function renderRulesView() {
  rulesView.querySelectorAll('.folder-wrapper:not(.plus-btn)').forEach(r => r.remove());
  addSiteRuleBtn.style.display = 'flex';
  addNameRuleBtn.style.display = 'flex';
}

// --- Add Folder / Rule Logic ---

// Helper function to safely create or update rule folders
function addRuleToMap(folderName, ruleValue) {
  if (!CURRENT_MAP[folderName]) {
    CURRENT_MAP[folderName] = { type: 'rule', rules: [], extensions: [] };
  } else if (CURRENT_MAP[folderName].type === 'category') {
    // If user adds a rule to an existing category, upgrade it to a rule folder
    CURRENT_MAP[folderName].type = 'rule';
  }
  
  if (!CURRENT_MAP[folderName].rules.includes(ruleValue)) {
    CURRENT_MAP[folderName].rules.push(ruleValue);
    saveFileMap(CURRENT_MAP);
  }
}

addFolderBtn.onclick = () => {
  const inputRow = createInlineInput("Category name...", (val) => {
    if (val) {
      const upperKey = val.toUpperCase().trim();
      if (!CURRENT_MAP[upperKey]) {
        CURRENT_MAP[upperKey] = { type: 'category', rules: [], extensions: [] };
        saveFileMap(CURRENT_MAP); 
      }
    }
    renderFolders();
  }, () => renderFolders());
  
  addFolderBtn.style.display = 'none';
  folderColumn.insertBefore(inputRow, addFolderBtn);
};

addSiteRuleBtn.onclick = () => {
  const siteInput = createInlineInput("site (e.g. google.com)", (val) => {
    if (val) {
      const cleanDomain = val.trim().toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
      const folderName = cleanDomain.split('.')[0].toUpperCase();
      addRuleToMap(folderName, cleanDomain);
    }
    renderRulesView();
    renderFolders();
  }, () => renderRulesView());
  
  addSiteRuleBtn.style.display = 'none';
  rulesView.insertBefore(siteInput, addSiteRuleBtn);
};

addNameRuleBtn.onclick = () => {
  const nameInput = createInlineInput("Keyword...", (val) => {
    if (val) {
      const keyword = val.trim().toLowerCase();
      addRuleToMap(keyword.toUpperCase(), keyword);
    }
    renderRulesView();
    renderFolders();
  }, () => renderRulesView());
  
  addNameRuleBtn.style.display = 'none';
  rulesView.insertBefore(nameInput, addNameRuleBtn);
};

// --- Reset Logic ---
const resetRulesBtn = document.getElementById('resetRulesBtn');

resetRulesBtn.onclick = () => {
  // Always ask for confirmation before wiping data!
  const isConfirmed = confirm("Are you sure? This will delete all your custom folders and rules, and restore the factory defaults.");
  
  if (isConfirmed) {
    // Create a deep copy of the static map so we don't accidentally mutate the original import
    CURRENT_MAP = JSON.parse(JSON.stringify(STATIC_MAP));
    
    // Save the fresh map to Chrome storage
    saveFileMap(CURRENT_MAP);
    
    // Clear the far right column
    extensionColumn.innerHTML = '';
    
    // Re-render the UI
    renderRulesView();
    renderFolders();
    
    // Small visual feedback
    resetRulesBtn.innerHTML = "✅ Reset Complete!";
    setTimeout(() => { resetRulesBtn.innerHTML = "⚠️ Reset to Defaults" }, 2000);
  }
};
// Bootstrap the app
init();