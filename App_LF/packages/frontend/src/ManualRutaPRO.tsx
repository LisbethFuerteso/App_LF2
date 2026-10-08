// Contenido de la pestaña "Acerca y Manual" del script R.
// Conserva las versiones 4.3 y 4.1 tal como aparecen en esa pestaña.
export default function ManualRutaPRO() {
  return (
    <section className="rutapro-manual" aria-label="Acerca y Manual">
      <div>
        <h1>🚜 Cosecha estratégica 4.3</h1>
        <p>
          Sistema de planeación, ruteo y monitoreo para la cosecha de caña de azúcar
        </p>
        <span className="rutapro-manual-autor">
          ✅ Desarrollado 100% en Ingeniería Incauca S.A.S.
        </span>
      </div>
      <div className="rutapro-manual-version">
        <p>📅 Versión 4.1 · 2026</p>
        <p>🏭 Campo + Cosecha</p>
        <p>📍 Incauca S.A.S. — Miranda, Cauca</p>
      </div>
    </section>
  );
}
