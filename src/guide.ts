export class GuideModal {
    private dialog: HTMLDialogElement;

    constructor() {
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'guide-modal';
        this.buildContent();
        document.body.appendChild(this.dialog);

        // Close on click outside (backdrop)
        this.dialog.addEventListener('click', (e) => {
            const rect = this.dialog.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                this.dialog.close();
            }
        });
    }

    private buildContent() {
        this.dialog.innerHTML = `
            <div class="guide-container">
                <div class="guide-header">
                    <h2>How to Play</h2>
                    <button class="close-guide-btn" aria-label="Close">&times;</button>
                </div>
                <div class="guide-body">
                    <div class="flavor-text">
                        冒険者求ム！…というチラシの裏に描かれた、サイコロ5個の即死迷宮。<br>
                        運とスキルで最下層(B5F)を目指せ。
                    </div>

                    <div class="rules-grid">
                        <div class="rules-col">
                            <div class="rule-box">
                                <h3>1. 振る (ROLL)</h3>
                                <ul>
                                    <li>ダイスを5個振る。</li>
                                    <li><span class="bold">合計3投</span>までOK (2回振り直し)。</li>
                                    <li>※好きな目だけ残して振れるよ。</li>
                                </ul>
                            </div>
                            <div class="rule-box">
                                <h3>2. 使う (SKILL)</h3>
                                <ul>
                                    <li>習得済み(✔️×3)のスキルを使用可。</li>
                                    <li>各スキル <span class="bold">1ターンに各1回</span> 使用OK。</li>
                                </ul>
                            </div>
                        </div>
                        <div class="rules-col">
                            <div class="rule-box">
                                <h3>3. 書く (WRITE)</h3>
                                <ul>
                                    <li>条件を満たすマスを<span class="bold">1つ</span>チェック。</li>
                                    <li>どこも埋められない ⇒ <span class="bold">即ゲームオーバー！</span></li>
                                    <li>B5Fをチェック ⇒ <span class="bold">ゲームクリア！</span></li>
                                </ul>
                            </div>
                            <div class="yaku-list">
                                <span class="bold">[役のメモ]</span><br>
                                ●3カード: 同じ目3つ (例: 5,5,5,1,2)<br>
                                ●フルハウス: 3つ揃い+2つ揃い<br>
                                ●ストレート: 数字が5つ続く (例: 1,2,3,4,5)<br>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const closeBtn = this.dialog.querySelector('.close-guide-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.dialog.close();
            });
        }
    }

    public show() {
        this.dialog.showModal();
    }
}
