// Router muito simples por hash: #dashboard, #regras, #dispositivos.
// Mostra a <section id="view-..."> correspondente e esconde as outras (SPA).

const VIEWS = ["dashboard", "regras", "dispositivos"];
const DEFAULT_VIEW = "dashboard";

function show(viewName) {
  const name = VIEWS.includes(viewName) ? viewName : DEFAULT_VIEW;

  $(".app-view").addClass("d-none");
  $(`#view-${name}`).removeClass("d-none");

  $(".nav-link").removeClass("active");
  $(`.nav-link[data-view="${name}"]`).addClass("active");

  // Fecha o menu em mobile depois de escolher
  $("#nav-menu").removeClass("show");
}

export function startRouter() {
  const handle = () => show(location.hash.replace("#", ""));
  window.addEventListener("hashchange", handle);
  handle();
}
