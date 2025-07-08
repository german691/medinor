# API REST para Sistema de Gestión Medinor SA

### Resumen

Este proyecto representa el backend del **Panel de Administración de Medinor** y su futura webstore, actuando como el núcleo lógico y estructural del sistema.

### Funcionalidades Principales

-   **Lógica de Negocio y Validaciones**\
    Aplica las reglas del negocio para asegurar operaciones válidas y seguras.

-   **Procesamiento de Archivos Inteligente**\
    Soporta la carga de archivos (Excel, CSV) desde el panel administrativo. La API analiza su contenido, lo contrasta con los datos existentes y determina qué registros son nuevos, repetidos o presentan conflictos, facilitando procesos masivos sin comprometer la integridad.

-   **Fuente Única de Verdad (SSOT)**\
    Toda interacción con los datos ---consultas, creaciones, actualizaciones o eliminaciones--- pasa por esta API, garantizando coherencia y trazabilidad en todo el sistema.

-   **Rendimiento y Escalabilidad**\
    Está optimizada para manejar grandes volúmenes de información y múltiples solicitudes concurrentes, permitiendo una experiencia fluida desde el panel aún bajo carga intensa.

### Objetivos del Proyecto

-   **Asegurar la integridad y consistencia de los datos empresariales.**

-   **Reducir la complejidad del sistema desde el punto de vista del usuario.**

-   **Automatizar reglas y procesos para minimizar errores humanos.**

-   **Proveer una base sólida y escalable que acompañe el crecimiento de Medinor.**
