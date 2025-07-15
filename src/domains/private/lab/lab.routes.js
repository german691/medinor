import express from "express";
import { createLab, getLabs } from "./lab.controller.js";
import auth from "../../../interface/middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route GET /
 * @desc Obtener un listado de todos los laboratorios existentes.
 * @access Privado (Usuario autenticado)
 * @returns {Object} Un objeto que contiene un array de laboratorios.
 * @returns {Array<Object>} returns.items - Lista de objetos de laboratorio, cada uno con la propiedad `lab`.
 */
router.get("/", auth(), getLabs);

/**
 * @route POST /
 * @desc Crea un nuevo laboratorio en el sistema.
 * @access Privado (Usuario autenticado)
 * @body {Object} body - El cuerpo de la solicitud, conteniendo el nombre del laboratorio.
 * @body {string} body.name - El nombre del laboratorio a crear.
 * @returns {201} - Retorna un mensaje de éxito y el objeto del laboratorio creado.
 * @returns {400} - Retorna un error si no se proporciona el nombre del laboratorio.
 * @returns {409} - Retorna un error si ya existe un laboratorio con el mismo nombre.
 * @returns {500} - Retorna un error si ocurre un problema interno del servidor al crear el laboratorio.
 */
router.post("/", auth(), createLab);

export default router;
