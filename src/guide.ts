export class GuideModal {
    private dialog: HTMLDialogElement;

    constructor() {
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'guide-modal';

        this.dialog.innerHTML = `
            <div class="guide-container">
                <button class="close-btn" aria-label="Close">×</button>
                <div class="guide-scroll">
                    <h1>チラシの裏ダンジョン</h1>
                    <p class="flavor">冒険者求ム！…というチラシの裏に描かれた、サイコロ5個の即死迷宮。<br>運とスキルで最下層(B5F)を目指せ。</p>

                    <div class="rule-box">
                        <h2>1. 振る (ROLL)</h2>
                        <ul>
                            <li>ダイスを5個振る。</li>
                            <li><span class="bold">合計3投</span>までOK (2回振り直し)。</li>
                            <li>※好きな目だけ残して振れるよ。</li>
                        </ul>
                    </div>

                    <div class="rule-box">
                        <h2>2. 使う (SKILL)</h2>
                        <ul>
                            <li>習得済み(✔️×3)のスキルを使用可。</li>
                            <li>各スキル <span class="bold">1ターンに各1回</span> 使用OK。</li>
                        </ul>
                    </div>

                    <div class="rule-box">
                        <h2>3. 書く (WRITE)</h2>
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

                    <div class="skills-info">
                         <h3>スキル (3つで解禁)</h3>
                         <p><strong>剛腕:</strong> 出目1つを「6」にする</p>
                         <p><strong>軽業:</strong> 出目1つを-1 する (最小1)</p>
                         <p><strong>変身:</strong> 出目1つを裏返す (1⇔6...)</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.dialog);

        const closeBtn = this.dialog.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        this.dialog.addEventListener('click', (e) => {
            const rect = this.dialog.getBoundingClientRect();
            // Check if click is outside the dialog rect
            // rect gives the dimensions of the dialog element (the white box)
            if (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
            ) {
                this.close();
            }
        });
    }

    open() {
        if (!this.dialog.open) {
            this.dialog.showModal();
        }
    }

    close() {
        this.dialog.close();
    }
}
