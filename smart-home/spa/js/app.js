// Ponto de entrada da SPA.
import { startRouter } from "./router.js";
import { initDashboard } from "./views/dashboard.js";
import { initRules } from "./views/rules.js";
import { initDevices } from "./views/devices.js";

$(function () {
  startRouter();
  initDashboard();
  initRules();
  initDevices();
});
