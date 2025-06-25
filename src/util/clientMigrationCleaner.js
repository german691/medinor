// src/utils/dataCleaner.js

/**
 * Limpia y normaliza el Cód. Cliente.
 * Extrae solo letras y números, los pasa a mayúsculas y los une.
 * @param {*} rawCod - El valor crudo del Cód. Cliente.
 * @returns {string} El Cód. Cliente saneado.
 */
export const cleanCodClient = (rawCod) => {
  if (typeof rawCod !== "string" && typeof rawCod !== "number") return "";
  const saneado = String(rawCod)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const letras = (saneado.match(/[A-Z]/g) || []).join("");
  const numeros = (saneado.match(/[0-9]/g) || []).join("");
  return letras + numeros;
};

/**
 * Limpia y normaliza el Identificador Fiscal (CUIT).
 * Extrae únicamente los dígitos numéricos.
 * @param {*} rawCuit - El valor crudo del CUIT.
 * @returns {string} El CUIT conteniendo solo números.
 */
export const cleanIdentiftri = (rawCuit) => {
  if (typeof rawCuit !== "string" && typeof rawCuit !== "number") return "";
  return String(rawCuit).replace(/\D/g, "");
};

/**
 * Limpia y normaliza la Razón Social.
 * La pasa a mayúsculas y le asigna un valor por defecto si está vacía.
 * @param {*} rawRazon - El valor crudo de la Razón Social.
 * @returns {string} La Razón Social limpia.
 */
export const cleanRazonSoci = (rawRazon) => {
  const trimmed = String(rawRazon || "").trim();
  if (!trimmed) {
    return "SIN CARGA INICIAL";
  }
  return trimmed.toUpperCase();
};
