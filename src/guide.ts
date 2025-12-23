import { Translator } from './i18n';

export class GuideModal {
  private dialog: HTMLDialogElement;
  private t: Translator;

  constructor(t: Translator) {
    this.t = t;
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'guide-modal';
    this.dialog.innerHTML = this.buildContent();

    // Close on backdrop click (outside content area)
    this.dialog.addEventListener('click', (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      // Only close if click is truly outside the visible content
      // This works because dialog padding creates the clickable backdrop area
      if (e.target === this.dialog) {
        this.close();
      }
    });

    // Close button handler
    this.dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('guide-close-btn')) {
        this.close();
      }
    });
  }

  get element(): HTMLDialogElement {
    return this.dialog;
  }

  open(): void {
    this.dialog.showModal();
  }

  close(): void {
    this.dialog.close();
  }

  private buildContent(): string {
    const t = this.t;
    return `
      <div class="guide-content">
        <header class="guide-header">
          <h2>${t('guide_title')}</h2>
          <button class="guide-close-btn" aria-label="Close">&times;</button>
        </header>
        <div class="guide-body">
          <section class="guide-section">
            <h3>1. ${t('guide_roll_title')}</h3>
            <ul>
              <li>${t('guide_roll_1')}</li>
              <li>${t('guide_roll_2')}</li>
              <li>${t('guide_roll_3')}</li>
            </ul>
          </section>

          <section class="guide-section">
            <h3>2. ${t('guide_skill_title')}</h3>
            <ul>
              <li>${t('guide_skill_1')}</li>
              <li>${t('guide_skill_2')}</li>
            </ul>
          </section>

          <section class="guide-section">
            <h3>3. ${t('guide_write_title')}</h3>
            <ul>
              <li>${t('guide_write_1')}</li>
              <li>${t('guide_write_2')}</li>
              <li>${t('guide_write_3')}</li>
            </ul>
          </section>
        </div>
        <footer class="guide-credit">( ・3・)←作った人</footer>
      </div>
    `;
  }
}
