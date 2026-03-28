import { DEFAULT_FILE_MAP as STATIC_MAP } from './filemap.js';

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  processDownload(item, suggest);
  return true; 
});

function processDownload(item, suggest) {
  chrome.storage.local.get(['FILE_MAP'], (result) => {
    const fileMap = result.FILE_MAP || STATIC_MAP;
    chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
      const email = (userInfo && userInfo.email) ? userInfo.email : "GUEST";
      const userFolder = email.split('@')[0].toUpperCase();
      const referrer = item.referrer || ""; 
      const filenameLower = item.filename.toLowerCase();
      const parts = item.filename.split('.');
      const hasExtension = parts.length > 1;
      const extension = hasExtension ? parts.pop().toLowerCase() : "";
      let typeFolder = hasExtension ? "OTHER" : "NO_EXTENSION";
      let matched = false;
      console.log(`Checking Download: ${item.filename}`);
      console.log(`Referrer Found: ${referrer}`);
      for (const [folderName, rules] of Object.entries(fileMap)) {
        const siteMatch = rules.find(r => referrer.toLowerCase().includes(r.toLowerCase()));
        const nameMatch = rules.find(r => filenameLower.includes(r.toLowerCase()));
        if (siteMatch || nameMatch) {
          console.log(`✅ HIGH PRIORITY MATCH: Folder [${folderName}] due to ${siteMatch ? 'Site' : 'Name'}`);
          typeFolder = folderName;
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (const [folderName, rules] of Object.entries(fileMap)) {
          if (rules.includes(extension)) {
            console.log(`ℹ️ EXTENSION MATCH: Folder [${folderName}]`);
            typeFolder = folderName;
            matched = true;
            break;
          }
        }
      }
      if (!matched) console.log(`❌ NO MATCH: Defaulting to ${typeFolder}`);
      suggest({
        filename: `${userFolder}/${typeFolder}/${item.filename}`,
        conflict_action: "uniquify"
      });
    });
  });
}