// Ponto único de acesso aos dados para toda a SPA.
// Escolhe a fonte conforme APP_CONFIG.DATA_SOURCE. As duas fontes têm exatamente
// as mesmas funções, por isso o resto da aplicação não sabe (nem precisa de saber)
// de onde vêm os dados.
//
// O import é dinâmico de propósito: em modo demo o firebase.js nem é carregado,
// por isso não dá erro com o firebase-config.js ainda por preencher.
import { APP_CONFIG } from "../config/app-config.js";

const source = APP_CONFIG.DATA_SOURCE === "firebase"
  ? await import("./firebase.js")
  : await import("./demo-data.js");

console.log(`[data] fonte de dados: ${APP_CONFIG.DATA_SOURCE}`);

export const { listen, listenLast, write, patch, add, removePath } = source;
