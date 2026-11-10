// Camada de acesso à Firebase. As views só falam com a BD através destas funções.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase, ref, onValue, set, update, push, remove, query, limitToLast
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig } from "../config/firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/** Ouve um caminho em tempo real (requisito g). Devolve a função para cancelar. */
export function listen(path, callback) {
  return onValue(ref(db, path), (snapshot) => callback(snapshot.val() ?? null));
}

/** Ouve os últimos N filhos de um caminho (ex.: alertas). */
export function listenLast(path, n, callback) {
  return onValue(query(ref(db, path), limitToLast(n)), (snapshot) => callback(snapshot.val() ?? {}));
}

/** Substitui o valor num caminho. */
export function write(path, value) {
  return set(ref(db, path), value);
}

/** Atualiza só alguns campos. */
export function patch(path, fields) {
  return update(ref(db, path), fields);
}

/** Adiciona um filho com id automático. Devolve o id. */
export async function add(path, value) {
  const newRef = push(ref(db, path));
  await set(newRef, value);
  return newRef.key;
}

/** Apaga um caminho. */
export function removePath(path) {
  return remove(ref(db, path));
}
