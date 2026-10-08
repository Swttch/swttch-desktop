const { app, dialog } = require('electron');
app.setName('Swttch 폴더 선택');
app.whenReady().then(async () => {
  app.dock?.hide();
  const result = await dialog.showOpenDialog({ title: '프로젝트 폴더 선택', properties: ['openDirectory'] });
  console.log(`FOLDER_SELECTION:${JSON.stringify(result.canceled ? null : result.filePaths[0])}`);
  app.quit();
}).catch(() => app.exit(1));
