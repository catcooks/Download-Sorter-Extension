import { DEFAULT_FILE_MAP as STATIC_MAP } from "./filemap.js";

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  processDownload(item, suggest);
  return true;
});

function processDownload(item, suggest) {
  chrome.storage.local.get(["FILE_MAP"], (result) => {
    const fileMap = result.FILE_MAP || STATIC_MAP;

    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
      // ... existing variables ...
      const email = userInfo && userInfo.email ? userInfo.email : "GUEST";
      const userFolder = email.split("@")[0].toUpperCase();

      // 1. ADD THE URL VARIABLE HERE
      const referrer = item.referrer || "";
      const downloadUrl = item.url || "";
      const filenameLower = item.filename.toLowerCase();

      const parts = item.filename.split(".");
      const hasExtension = parts.length > 1;
      const extension = hasExtension ? parts.pop().toLowerCase() : "";

      let typeFolder = hasExtension ? "Other" : "NO_EXTENSION";
      let matched = false;

      console.log(`Checking Download: ${item.filename}`);
      console.log(`URL Found: ${downloadUrl}`); // Add logging to help you debug
      console.log(`Referrer Found: ${referrer}`);

      // PASS 1: HIGH PRIORITY (Rule Folders)
      for (const [folderName, data] of Object.entries(fileMap)) {
        if (data.type === "rule") {
          // 2. CHECK ALL THREE: Referrer, URL, and Filename
          const matchesRule = data.rules.some((r) => {
            const rule = r.toLowerCase();
            return (
              referrer.toLowerCase().includes(rule) ||
              downloadUrl.toLowerCase().includes(rule) ||
              filenameLower.includes(rule)
            );
          });

          if (matchesRule) {
            if (data.extensions.length > 0) {
              if (data.extensions.includes(extension)) {
                typeFolder = folderName;
                matched = true;
                break;
              }
            } else {
              typeFolder = folderName;
              matched = true;
              break;
            }
          }
        }
      }
      // ... rest of the script ...

      // PASS 2: MEDIUM PRIORITY (Category Folders)
      if (!matched) {
        for (const [folderName, data] of Object.entries(fileMap)) {
          if (data.type === "category") {
            if (data.extensions.includes(extension)) {
              console.log(`ℹ️ MATCH: [${folderName}] (Extension Only)`);
              typeFolder = folderName;
              matched = true;
              break;
            }
          }
        }
      }

      if (!matched) console.log(`❌ NO MATCH: Defaulting to ${typeFolder}`);

      suggest({
        filename: `${userFolder}/${typeFolder}/${item.filename}`,
        conflict_action: "uniquify",
      });
    });
  });
}
