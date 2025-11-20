/********** MATERIAL UI INSTANTIATIONS **********/
import {MDCTabBar} from '@material/tab-bar';
import {MDCRipple} from '@material/ripple';
import {MDCSnackbar} from '@material/snackbar';
import { saveAs } from 'file-saver';
const remote = window.require('electron').remote;
const fs = window.require('fs');

// Set window title
var pjson = require('../package.json');
window.document.title = "CADS v" + pjson.version;

// Instantiate snackbar
const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));
const snackbar_label = document.querySelector('.mdc-snackbar__label');

const buttonRipple = new MDCRipple(document.querySelector('.mdc-button'));

const mdc = require('material-components-web');
const tabBar = new MDCTabBar(document.querySelector('.mdc-tab-bar'));

// Instantiate MDC Drawer
const drawerEl = document.querySelector('.mdc-drawer');
const drawer = new mdc.drawer.MDCDrawer.attachTo(drawerEl);

// Instantiate MDC Top App Bar (required)
const topAppBarEl = document.querySelector('.mdc-top-app-bar');
const topAppBar = new mdc.topAppBar.MDCTopAppBar.attachTo(topAppBarEl);

topAppBar.setScrollTarget(document.querySelector('.main-content'));
topAppBar.listen('MDCTopAppBar:nav', () => {
  drawer.open = !drawer.open;
});

const listEl = document.querySelector('.mdc-drawer .mdc-list');
const mainContentEl = document.querySelector('.main-content');

listEl.addEventListener('click', (event) => {
  drawer.open = false;
});

// Nav drawer listeners
const navSaveEl = document.querySelector('.nav-action-save');
navSaveEl.addEventListener('click', (event) => {
  const tempFile = remote.getGlobal('shared').tempFileLoc;
  if (!tempFile) {
    // Alert no file to save
    snackbar_label.innerHTML = "No file to save, try loading a die study first.";
    snackbar.open();
  }
  else {
    fs.readFile(tempFile, 'utf8', function(err, data) {
      if (err) {
        console.log(err);
        snackbar_label.innerHTML = "Unable to save file. Please try again.";
        snackbar.open();
        return;
      }

      // Save permanently with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `cads-study-${timestamp}.json`;
      var blob = new Blob([data], {type: "application/json"});
      saveAs(blob, filename);

      // Show success message
      snackbar_label.innerHTML = `Study saved as ${filename}`;
      snackbar.open();
    });
  }
});

// Export button functionality (same as Save)
const navExportEl = document.querySelector('.nav-action-export');
navExportEl.addEventListener('click', (event) => {
  const tempFile = remote.getGlobal('shared').tempFileLoc;
  if (!tempFile) {
    // Alert no file to export
    snackbar_label.innerHTML = "No file to export, try loading a die study first.";
    snackbar.open();
  }
  else {
    fs.readFile(tempFile, 'utf8', function(err, data) {
      if (err) {
        console.log(err);
        snackbar_label.innerHTML = "Unable to export file. Please try again.";
        snackbar.open();
        return;
      }

      // Export with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `cads-study-${timestamp}.json`;
      var blob = new Blob([data], {type: "application/json"});
      saveAs(blob, filename);

      // Show success message
      snackbar_label.innerHTML = `Study exported as ${filename}`;
      snackbar.open();
    });
  }
});

import {MDCTextField} from '@material/textfield';

// const textField = new MDCTextField(document.querySelector('.mdc-text-field'));
