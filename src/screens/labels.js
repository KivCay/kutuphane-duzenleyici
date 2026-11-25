// 5 · Etiketler. Modül 3'te gelecek; şimdilik yer tutucu.
import { header } from '../ui.js';

export function render() {
  return `<section class="screen">
    ${header('Etiketler', '#/')}
    <div class="pad stack-16">
      <div class="empty">
        <p class="empty-title">Yakında</p>
        <p>Kapak ve sırt etiketleri bir sonraki modüllerde eklenecek.</p>
      </div>
    </div>
  </section>`;
}

export function mount() {}
