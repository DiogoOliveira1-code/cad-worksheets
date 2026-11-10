# Smart Home — Controlo e Monitorização Inteligente

Projeto DAM 2026/2027. SPA + dispositivo IoT que comunicam **apenas** através da
Firebase Realtime Database (a SPA nunca fala diretamente com o IoT).

```
 [Browser / SPA]  <--->  [Firebase RTDB]  <--->  [Raspberry Pi / iot-app]  <--->  sensores + atuadores
                                ^
                                |  (iot-app escreve /external)
                        [APIs externas: Open-Meteo, Sunrise-Sunset]
```

## Estrutura de pastas

```
smart-home/
├── README.md
├── .gitignore
├── firebase/                         # (c) Configuração da Firebase
│   ├── database.rules.json           # regras de acesso da RTDB
│   └── seed-data.json                # estrutura inicial da BD (importar na consola)
│
├── spa/                              # (a) Aplicação cliente (SPA)
│   ├── index.html                    # única página: navbar + 3 ecrãs
│   ├── css/style.css
│   └── js/
│       ├── app.js                    # ponto de entrada: arranca router e ecrãs
│       ├── router.js                 # navegação entre ecrãs (hash #dashboard, #regras, #dispositivos)
│       ├── config/
│       │   ├── firebase-config.js    # firebaseConfig do projeto (preencher)
│       │   └── constants.js          # catálogo de tipos de sensores/atuadores, caminhos da BD
│       ├── services/
│       │   └── firebase.js           # init + helpers (listen, write, patch, add, remove)
│       ├── views/                    # um ficheiro por ecrã
│       │   ├── dashboard.js          # Ecrã 1: info geral + divisões em tempo real
│       │   ├── rules.js              # Ecrã 2: regras de automação + alertas
│       │   └── devices.js            # Ecrã 3: adicionar/remover sensores, atuadores e zonas
│       ├── components/               # pedaços de HTML reutilizáveis
│       │   ├── info-card.js
│       │   ├── zone-card.js
│       │   ├── sensor-item.js
│       │   ├── actuator-item.js
│       │   └── rule-item.js
│       └── utils/
│           └── format.js             # formatação de valores, datas, ids
│
└── iot-app/                          # (b) Aplicação do dispositivo IoT (Raspberry Pi)
    ├── package.json
    ├── serviceAccountKey.json        # NÃO vai para o git (gerar na consola Firebase)
    └── src/
        ├── main.js                   # ponto de entrada: liga tudo
        ├── config.js                 # URL da BD, intervalos, localização, pinos
        ├── firebase.js               # Admin SDK
        ├── hardware/
        │   └── gpio.js               # wrapper do onoff (com modo mock fora do Pi)
        ├── devices/
        │   ├── device-types.js       # gamas e comportamento por tipo
        │   ├── sensor-factory.js     # cria sensores reais ou simulados
        │   ├── actuator-factory.js   # cria atuadores reais ou simulados
        │   └── device-manager.js     # sincroniza dispositivos com /zones e publica leituras
        ├── services/                 # APIs externas (requisito f)
        │   ├── weather-api.js        # Open-Meteo (meteorologia)
        │   ├── air-quality-api.js    # Open-Meteo Air Quality
        │   ├── sun-api.js            # sunrise-sunset.org
        │   └── external-data.js      # agenda as chamadas e grava em /external
        └── rules/
            └── rules-engine.js       # avalia regras e executa ações (requisito e)
```

## Modelo de dados (Firebase RTDB)

```
/home        { name }
/zones/{zoneId}
    name, icon, order
    sensors/{sensorId}     { type, name, value, unit, simulated, gpio?, updatedAt }
    actuators/{actuatorId} { type, name, state, simulated, gpio?, updatedAt }
/rules/{ruleId}
    name, enabled, logic: "AND"|"OR"
    conditions: [ { source: "sensor"|"external", path, operator, value } ]
    actions:    [ { type: "actuator", path, state } | { type: "alert", message, level } ]
/alerts/{pushId}   { message, level, ruleId, createdAt }
/external          { weather, airQuality, sun, updatedAt }
```

`path` nas regras é relativo à raiz, ex.: `zones/sala/sensors/sala_temp` ou `external/weather/temperature`.

## Decisões principais

- **O motor de regras corre no IoT**: assim a automação funciona mesmo sem nenhum browser aberto.
- **As APIs externas são chamadas pelo IoT** e gravadas em `/external`: as regras podem usar a
  temperatura exterior e a SPA só precisa de ler a BD.
- **Sensores/atuadores reais e simulados** coexistem (campo `simulated`). O enunciado exige
  pelo menos 1 sensor real e 1 atuador real (ex.: PIR de movimento + LED/relé de iluminação).
- O IoT ouve `/zones`, por isso dispositivos e zonas adicionados no Ecrã 3 aparecem sem reiniciar.

## Correr

**Antes de tudo**
1. Criar o projeto Firebase com Realtime Database (europe-west1).
2. Importar `firebase/seed-data.json` na consola (Realtime Database → ⋮ → Import JSON).
3. Copiar o `firebaseConfig` para `spa/js/config/firebase-config.js`.
4. Gerar a chave da service account e guardá-la como `iot-app/serviceAccountKey.json`.
5. Pôr o `databaseURL` em `iot-app/src/config.js`.

**IoT**:
```
cd iot-app
npm install
npm start        # no Raspberry Pi (GPIO real)
npm run mock     # no PC, GPIO simulado
```

Hardware real previsto no seed: sensor PIR no GPIO27 (`sala_pir`) e LED/relé no GPIO17 (`sala_luz`).

**SPA**: servir a pasta `spa/` com um servidor HTTP local (ex.: extensão Live Server do VS Code
ou `npx http-server spa`), tal como nas fichas. Os módulos ES não funcionam abertos com `file://`.

## Mapa requisitos → ficheiros

| Req. | Onde |
|---|---|
| a) 2+ infos gerais | `views/dashboard.js` (temp. média, consumo, segurança, meteo) |
| b) 2+ divisões c/ 2+ elementos | `firebase/seed-data.json`, `components/zone-card.js` |
| c) 2+ tipos de sensores | `config/constants.js`, `devices/sensor-factory.js` |
| d) 2+ tipos de atuadores | `config/constants.js`, `devices/actuator-factory.js` |
| e) regras | `views/rules.js`, `rules/rules-engine.js` |
| f) 2+ APIs externas | `services/*-api.js` |
| g) tempo real | listeners `onValue` em todas as views |
| h) Firebase | `services/firebase.js`, `iot-app/src/firebase.js` |
| Época Normal: novas zonas | `views/devices.js` (formulário "Nova zona") |
