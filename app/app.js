import { DEFAULT_FILE_MAP as STATIC_MAP } from './filemap.js';
import { saveFileMap, getFileMap } from './storage.js';

const folderColumn = document.getElementById('folderColumn');
const extensionColumn = document.getElementById('fileExtension');
const addFolderBtn = document.getElementById('addFolderBtn');
const addExtBtn = document.getElementById('addExtBtn');

let CURRENT_MAP = {};
async function init() {
  CURRENT_MAP = await getFileMap(STATIC_MAP);
  renderFolders();
}
function formatName(name) {
  let formatted = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return formatted.endsWith('s') ? formatted.slice(0, -1) : formatted;
}
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
  btn.onclick = onClick;
  return btn;
}

function createItemWrapper(mainBtn, deleteBtn, className) {
  const wrapper = document.createElement('div');
  wrapper.className = className;
  wrapper.appendChild(mainBtn);
  wrapper.appendChild(deleteBtn);
  return wrapper;
}


function renderFolders() {
  folderColumn.querySelectorAll('.folder-wrapper:not(.plus-btn)').forEach(f => f.remove());
  addFolderBtn.style.display = 'flex';
  Object.keys(CURRENT_MAP).forEach(key => {
    const btn = createActionButton(`📁 ${formatName(key)}`, 'folder-btn', () => {
      document.querySelectorAll('.folder-btn').forEach(b => {
        if (b.tagName === 'BUTTON') b.innerHTML = b.innerHTML.replace('📂', '📁');
      });

      btn.innerHTML = btn.innerHTML.replace('📁', '📂');
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
  const list = CURRENT_MAP[key];
  if (!list) return;
  list.forEach((item, index) => {
    let displayLabel = item;
    if (!item.includes('.') || item.length <= 4) {
      displayLabel = `.${item}`; 
    } else {
      displayLabel = `🌐 ${item}`; 
    }
    const btn = createActionButton(displayLabel, 'folder', null);
    const delBtn = createActionButton('⛔', 'delete-btn', () => {
      if (delBtn.innerHTML === '⛔') {
        delBtn.innerHTML = '❓';
        setTimeout(() => { if (delBtn) delBtn.innerHTML = '⛔' }, 2000);
      } else {
        CURRENT_MAP[key].splice(index, 1);
        saveFileMap(CURRENT_MAP);
        renderExtensions(key);
      }
    });
    const wrapper = createItemWrapper(btn, delBtn, 'extension-item');
    extensionColumn.appendChild(wrapper);
  });
  addExtBtn.style.display = 'flex';
  extensionColumn.appendChild(addExtBtn);
  addExtBtn.onclick = () => {
    const inputRow = createInlineInput("ext...", (val) => {
      if (val) {
        const clean = val.replace('.', '').toLowerCase().trim();        
        Object.keys(CURRENT_MAP).forEach(folderKey => {
          const foundIndex = CURRENT_MAP[folderKey].indexOf(clean);
          if (foundIndex !== -1) {
            CURRENT_MAP[folderKey].splice(foundIndex, 1);
            console.log(`Moved .${clean} from ${folderKey} to ${key}`);
          }
        });
        CURRENT_MAP[key].push(clean);
        saveFileMap(CURRENT_MAP);
      }

      renderExtensions(key);
      renderFolders();
    }, () => renderExtensions(key));
    addExtBtn.style.display = 'none';
    extensionColumn.insertBefore(inputRow, addExtBtn);
  };
}


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
    renderRules();
  } else {
    renderFolders();
  }
};

function renderRules() {
  rulesView.querySelectorAll('.folder-wrapper:not(.plus-btn)').forEach(r => r.remove());
  addSiteRuleBtn.style.display = 'flex';
  addNameRuleBtn.style.display = 'flex';
}
addSiteRuleBtn.onclick = () => {
  const siteInput = createInlineInput("site (google.com)", (val) => {
    if (val) {
      const cleanDomain = val.trim().toLowerCase()
        .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
        .split('/')[0];
      const siteName = cleanDomain.split('.')[0]; 
      const folderName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
      if (!CURRENT_MAP[folderName]) {
        CURRENT_MAP[folderName] = [cleanDomain, siteName.toLowerCase()];
        saveFileMap(CURRENT_MAP);
      }
    }
    renderRules();
    renderFolders();
  }, () => renderRules());
  addSiteRuleBtn.style.display = 'none';
  rulesView.insertBefore(siteInput, addSiteRuleBtn);
};
addNameRuleBtn.onclick = () => {
  const nameInput = createInlineInput("Keyword...", (val) => {
    if (val) {
      const keyword = val.trim();
      const folderName = keyword.toUpperCase();
      if (!CURRENT_MAP[folderName]) {
        CURRENT_MAP[folderName] = [keyword];
        saveFileMap(CURRENT_MAP); 
      }
    }
    renderRules();
    renderFolders();
  }, () => renderRules());
  addNameRuleBtn.style.display = 'none';
  rulesView.insertBefore(nameInput, addNameRuleBtn);
};

addFolderBtn.onclick = () => {
  const inputRow = createInlineInput("Category name...", (val) => {
    if (val) {
      const upperKey = val.toUpperCase();
      if (!CURRENT_MAP[upperKey]) {
        CURRENT_MAP[upperKey] = [];
        saveFileMap(CURRENT_MAP); 
      }
    }
    renderFolders();
  }, () => renderFolders());
  addFolderBtn.style.display = 'none';
  folderColumn.insertBefore(inputRow, addFolderBtn);
};
init();