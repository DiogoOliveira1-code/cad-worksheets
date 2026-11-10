// Configuração geral da SPA.
//
// DATA_SOURCE:
//   "demo"     -> dados de exemplo dentro do browser, não precisa de Firebase nem de hardware
//   "firebase" -> dados reais da Firebase Realtime Database (preencher firebase-config.js)
export const APP_CONFIG = {
  DATA_SOURCE: "demo",

  // Só para o modo demo: de quantos em quantos ms os sensores mudam de valor
  DEMO_UPDATE_INTERVAL: 3000
};
