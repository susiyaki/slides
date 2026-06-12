---
theme: seriph
title: 自動化を社内アカウントだけで完結させたくて、GitHub App を仲間に入れた話
info: |
  社内 LT / 想定 11 分 / 本編 15 枚 + 付録 4 枚
class: text-center
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
---

# 自動化を社内アカウントだけで<br>完結させたくて、<br>GitHub App を仲間に入れた話

<div class="text-lg text-amber-900 mt-6">— oven-docs を複数リポに撒くために —</div>

<!--
ドキュメント用の oven-docs リポを複数のアプリリポに submodule で配ろうとして、自動化を作った話をします。途中で GitHub App を社内に初導入することになったので、その辺を中心に。
-->

---

# 動機 — Renovate に任せようとした

**やりたいこと**

- oven-docs の main が更新されたら、下流リポの submodule pointer を自動更新

**最初の選択 → 失敗**

- Renovate の `git-submodules` manager を有効化 (PR #29419)
- 見込み: 2〜3 時間以内に PR が作られて approve & merge
- **実態: Rate Limit で PR が全然作られないことがあった**

<div class="mt-4 p-3 border-l-4 border-amber-500 bg-amber-50 text-amber-900 text-sm">
submodule pointer が古いまま滞留 → 「更新したはずなのに反映されてない」が頻発<br>
→ revert (#29667)、自前で書くことに
</div>

<!--
最初は Renovate に任せようとしたんですよ。submodule の manager があるので。でも有効化してみたら、Rate Limit で PR が全然作られないことがあって、submodule pointer が古いまま滞留する状況が起きた。Renovate のキューに乗らないと自分のタイミングでは動かないので、これは自前で書く必要があるなと判断して revert しました。
-->

---

# 要件 — 自動化を社内アカウントで完結させる

自前で書く前に、満たしたい **3 つの前提** を整理:

1. **branch protection が厳格** — approve なしでは merge できない
2. **個人 PAT は使いたくない**
   - 退職・休職で死ぬ
   - 「自動化」と「個人操作」が log で区別できない
   - 個人 PAT に組織横断の権限を持たせたくない
3. **既存の運用を弄らずに進めたい**
   - `jw-machine` (既存の自動化用アカウント) は使うが、新規アカウントを増やしたくない

<!--
自前で書くにしても、満たしたい前提が 3 つあった。1 つ目は branch protection が厳しくて、approve なしでは merge できないこと。2 つ目は個人 PAT を使いたくない。退職とか権限漂流とかリスクが多いので。3 つ目は既存の運用を弄らずに進めたい。jw-machine っていう自動化用アカウントが社内に既にあるんですけど、これを使う範囲に留めて、新規に machine user を生やしたりはしたくなかった。
-->

---
layout: center
---

# 設計時の制約 — 2 人目のアクターが必要

<div class="flex flex-col items-center gap-3 my-6">
  <div class="flex gap-6">
    <div class="px-5 py-3 border-2 border-amber-800 bg-white/70 rounded-md w-72 shadow">
      <div class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">branch protection</div>
      <div class="text-sm text-amber-950">approve なしでは merge できない</div>
    </div>
    <div class="px-5 py-3 border-2 border-amber-800 bg-white/70 rounded-md w-72 shadow">
      <div class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">GitHub の仕様</div>
      <div class="text-sm text-amber-950">PR 作成者は自分の PR を approve できない</div>
    </div>
  </div>
  <div class="text-2xl text-amber-800">↓</div>
  <div class="px-6 py-3 border-2 border-amber-900 bg-amber-700 rounded-md font-bold text-amber-50 shadow-lg">
    2 人目のアクターが必須
  </div>
</div>

- 1 アカウントで自動 PR を完結させるのは **構造的に不可能**
- これは PAT でも App でも同じ制約

<!--
ここで設計上の制約に気付くんですけど、branch protection で approve 必須なのと、GitHub の仕様で PR を作成したアカウントは自分の PR を approve できないというルールがあって。つまり 1 アカウントだけで自動 PR を完結させることは構造的にできない。PAT でも App でも、ここは変わらない。
-->

---

# 選択肢比較 — 2 人目をどう用意するか

| 案 | 内容 | 評価 |
|---|---|---|
| ① 別の人間の PAT | チームメイトの個人 PAT を Secrets に | ❌ 個人 PAT は使わない方針 |
| ② 新規 machine user | jw-machine とは別の自動化アカウントを作る | ❌ 既存資産を弄らず進めたい |
| **③ GitHub App** | App をもう 1 つのアクターとして導入 | ⚠️ **社内前例なし** |

<div class="mt-4 p-3 border-l-4 border-amber-500 bg-amber-50 text-amber-900 text-sm">
残るは ③ だが、前例なし → 社内に相談しに行く
</div>

<!--
じゃあ 2 人目をどうするか。3 案あって、別の人の個人 PAT、新規 machine user、GitHub App。①と②は前提でだいたい潰れる。残るは ③ なんですが、社内で GitHub App を採用した前例がなかった。これを勝手に入れることはできないので、社内に相談しに行きました。
-->

---

# そもそも GitHub App とは — PAT との違い

| 観点 | PAT | GitHub App |
|---|---|---|
| 紐づき先 | 人 | App (Bot) |
| トークン寿命 | 任意設定 (90日 / 無期限) | **Installation token = 1h 自動失効** |
| レート制限 | 個人 5000/h | App 単位、インストール先で増える |
| commit author | 自分 | `your-app[bot]` |
| 退職に強い | 弱い | 強い |

<!--
App は PAT と何が違うかというと、人ではなく App っていうアクターに紐づくトークンなんですね。寿命が 1 時間で自動失効するとか、commit author が bot になるとか、退職で死なないとか。
-->

---

# そもそも GitHub App とは — 仕組み

- App ID と private key を Secrets に置く
- `actions/create-github-app-token@v3` が JWT 自己署名 → installation token を肩代わり

<div class="mt-6 p-3 border-l-4 border-amber-500 bg-amber-50 text-amber-900 text-sm">
昔は自前で JWT 署名コードを書く必要があったが、Action 一発で済むようになった
</div>

<!--
実装としては、App の ID と private key を Secrets に置いて、actions/create-github-app-token っていう Action を呼ぶと、JWT 署名から installation token への変換を全部やってくれる。昔は自前で JWT 書く必要があったんですけど、今は Action 一発です。
-->

---

# App を社内に持ち込むまで

**社内合意で確認したこと**

- **どの権限を要求するか?** — Pull requests R/W / Contents R/W / Metadata R (最小)
- **どの範囲にインストールするか?** — oven-docs & target リポ (oven-webapp 等) のみ
- **何をする App か?** — submodule pointer の更新 PR のみ。コード本体は触らない

<div class="mt-4 p-3 border-l-4 border-amber-800 bg-amber-100/60 text-amber-900 text-sm font-semibold">
合意できた理由: 用途を「ドキュメント用リポの submodule HEAD 更新」に絞った
</div>

- コード本体を変更する App だったら話が違っていた

<div class="mt-4 p-3 border-l-4 border-amber-500 bg-amber-50 text-amber-900 text-sm">
<strong>学び: 最小・低リスクな用途で前例を作る</strong>
</div>

<!--
ここが今回のメインの学びなんですけど、社内に持ち込むときに何を聞かれて、何を答えたか。要求する権限、インストール範囲、何をする App か。この 3 つを最小に絞って説明した。結果として「ドキュメント用リポの submodule HEAD 更新だけする App」ということで合意できた。たぶんこれが「コード本体を変更する App」だったら、もっとレビューが厚くなってたと思う。新しい技術を社内に入れたいときは、最小スコープで前例を作るのが効くんだなと学びました。
-->

---

# 最終アーキテクチャ

<div class="flex flex-col items-center gap-2 my-4">
  <div class="border-2 border-amber-800 bg-white/70 rounded-md px-6 py-4 w-[640px] shadow">
    <div class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">oven-docs (上流)</div>
    <div class="text-sm text-amber-950 mb-3">main に push → workflow: <code>sync-head-to-dependents</code></div>
    <div class="grid grid-cols-1 gap-1 text-sm text-amber-950">
      <div>① <strong>App</strong> でトークン発行</div>
      <div>② target を checkout・submodule 更新</div>
      <div>③ <strong>App</strong> token で PR 作成</div>
      <div>④ <strong>jw-machine PAT</strong> で approve <span class="text-xs text-amber-700">← 2 人目</span></div>
      <div>⑤ <strong>jw-machine PAT</strong> で auto-merge <span class="text-xs text-amber-700">← 2 人目</span></div>
    </div>
  </div>
  <div class="text-2xl text-amber-800">↓</div>
  <div class="border-2 border-amber-800 bg-white/70 rounded-md px-6 py-3 w-[640px] shadow">
    <div class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">oven-webapp (下流)</div>
    <div class="text-sm text-amber-950">PR が自動で approve & merge される</div>
  </div>
</div>

- **App** = PR 作成 (人ではないアクター、寿命 1h、退職に強い)
- **jw-machine PAT** = approve & merge (既存アカウント、社内認知あり)

<!--
最終的にこういう形になりました。App が PR を作って、jw-machine の PAT が approve と merge をする。2 人のアクターで分担している。両方とも社内のアカウントなので、個人 PAT は一切使ってない。
-->

---

# コード① — App token 発行

```yaml
- name: Generate App installation token
  id: app-token
  uses: actions/create-github-app-token@v3
  with:
    app-id: ${{ secrets.SYNC_APP_ID }}
    private-key: ${{ secrets.SYNC_APP_PRIVATE_KEY }}
    owner: jubilee-works
    repositories: |
      oven-webapp
      oven-docs
```

- App ID と private key を Secrets に置くだけ
- `repositories:` で installation token のスコープを絞れる

<!--
コードの肝は 3 ブロックだけ。まず token 発行。App ID と private key を Secrets に入れて、actions/create-github-app-token を呼ぶ。これで 1 時間寿命の installation token が手に入る。
-->

---

# コード② — PR 作成

```yaml {all|3|all}
- uses: peter-evans/create-pull-request@v8
  with:
    token: ${{ steps.app-token.outputs.token }}    # ← App token
    branch: chore/update-oven-docs
    title: "chore(deps): bump oven-docs to ${{ short_sha }}"
```

- token は **App のもの**
- 同名ブランチがあれば PR を上書き更新 (新規量産しない)

<!--
次に PR 作成。peter-evans の Action に App token を渡すだけ。同名ブランチがあれば上書きしてくれるので、PR が量産されない。
-->

---

# コード③ — approve & auto-merge

```yaml {all|2|all}
- env:
    GH_TOKEN: ${{ secrets.JW_MACHINE_PAT }}    # ← ここだけ PAT
  run: |
    gh pr review --approve "$PR"
    gh pr merge --auto --merge "$PR"
```

- ここだけ **jw-machine の PAT**
- App では approve できないので、2 人目に交代

<!--
最後に approve と auto-merge。ここだけ jw-machine の PAT を使う。Slide 4 で話した通り、App では自分の作った PR は approve できないので、2 人目の jw-machine に交代するという構造です。
-->

---

# つまずき① — submodule の checkout が必須

<div class="my-4 text-sm">
  <div class="border border-amber-800 bg-white/70 rounded-md p-4 mb-4">
    <div class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3">親リポ: oven-webapp が持っているもの</div>
    <div class="space-y-2.5 text-amber-950 text-sm leading-relaxed">
      <div><code>.gitmodules</code> <span class="text-xs text-amber-700">— submodule の URL 等の <strong>設定</strong></span></div>
      <div><strong>submodule pointer</strong> = <code>a1b2c3</code> <span class="text-xs text-amber-700">— commit ID として記録、<strong>これを更新したい</strong></span></div>
      <div><code>oven-docs/</code> working tree <span class="text-xs text-amber-700">— HEAD: <code>a1b2c3</code></span></div>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="border border-amber-800 bg-white/70 rounded-md p-4">
      <div class="font-bold text-amber-900 mb-2 text-sm">NG: <code class="text-xs">.gitmodules</code> 編集のみ</div>
      <div class="text-xs text-amber-950 leading-relaxed">
        pointer は変わらない<br>
        → <code class="text-xs">git add -A</code> で拾われない
      </div>
    </div>
    <div class="border border-amber-800 bg-white/70 rounded-md p-4">
      <div class="font-bold text-amber-900 mb-2 text-sm">OK: working tree で <code class="text-xs">checkout xyz</code></div>
      <div class="text-xs text-amber-950 leading-relaxed">
        HEAD 更新 → pointer 自動更新<br>
        → <code class="text-xs">git add</code> で拾われる
      </div>
    </div>
  </div>
</div>

→ working tree を実際に **新 sha へ checkout** する必要がある (= submodule で fetch も必要)

<!--
つまずきポイント 1 つ目。やりたいのは submodule pointer を新しい sha に bump する PR を作ることです。親リポの oven-webapp は submodule についていくつかの情報を持っていて、.gitmodules という設定ファイルと、submodule pointer という commit ID と、実際の working tree です。peter-evans/create-pull-request は working tree の状態を git add -A で拾うので、.gitmodules を書き換えるだけでは pointer は変わらず、何も拾えない。実際に submodule の working tree を新しい sha に checkout すると、pointer が自動的に更新されて git add で拾われる、という挙動になります。そしてその checkout のためには submodule で fetch も必要、という流れになって、次のつまずきにつながります。
-->

---

# つまずき② — submodule の auth header が消える

<div class="my-4 text-sm">
  <div class="border border-amber-800 bg-white/70 rounded-md p-4 mb-3">
    <div class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3">actions/checkout の挙動 (<code>persist-credentials: false</code>)</div>
    <div class="flex items-center justify-around gap-2 text-amber-950">
      <div class="border border-amber-700 bg-amber-50 rounded px-3 py-3 text-xs text-center w-36 leading-relaxed">
        token で<br>submodule を checkout
      </div>
      <div class="text-xl text-amber-700">→</div>
      <div class="border border-amber-700 bg-amber-50 rounded px-3 py-3 text-xs text-center w-36 leading-relaxed">
        直後に<br>auth header を削除
      </div>
      <div class="text-xl text-amber-700">→</div>
      <div class="border-2 border-amber-900 bg-amber-100 rounded px-3 py-3 text-xs text-center w-36 text-amber-900 font-semibold leading-relaxed">
        ① の checkout で<br>fetch が認証なし
      </div>
    </div>
  </div>

  <div class="border-l-4 border-amber-700 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 leading-relaxed">
    <strong>なぜ即消すのか:</strong> token が <code>.git/config</code> に残ると <strong>(a)</strong> 同 runner の後続 job / ステップで意図せず使える ・ <strong>(b)</strong> <code>git config -l</code> や log 出力で漏れる可能性 → <strong>使ったら即消す</strong>のが secret のベストプラクティス
  </div>
</div>

→ 対処: token を URL に埋めて一時 fetch、終わったら **戻す**

```bash
token_url="https://x-access-token:${APP_TOKEN}@github.com/${REPO}.git"
git -C "$sub" remote set-url origin "$token_url"   # token 埋め
git -C "$sub" fetch origin main                     # 認証ありで fetch
git -C "$sub" checkout origin/main                  # working tree 進める
git -C "$sub" remote set-url origin "$orig_url"    # 戻す (token 消す)
```

<!--
2 つ目。①の checkout をするには fetch が要るんですが、認証情報がない。actions/checkout の persist-credentials: false 指定で、checkout した直後に auth header が削除される仕様になってるからです。これは workflow 中に secret が .git/config に残ると、他リポにアクセスできてしまう権限漏洩のリスクがあるので、ベストプラクティスとして false にしてる。仕方ないので、token 入り URL を一時的に origin に書き換えて fetch して、終わったら戻す、という小ハックを入れています。使ったらすぐ消すのが secrets の鉄則です。
-->

---

# つまずき③ — install 先で security が変わる

App 導入時のインストール先の **1 画面** で security 度が変わる:

| 選択 | アクセス範囲 | security |
|---|---|---|
| **誤**: `jw-machine` (個人アカウント) | jw-machine から見える全リポ = collaborator 状況に従属 | <span class="whitespace-nowrap">⚠️ **グレー**</span> |
| **正**: org `jubilee-works` の Selected repositories | App 単体で「このリポでしか動かない」が明示 | <span class="whitespace-nowrap">✅ **セキュア**</span> |

<div class="mt-4 p-3 border-l-4 border-amber-800 bg-amber-100/60 text-amber-900 text-sm font-semibold">
App と machine user の権限を絡めない。App は独立したアクターとして org に登録する
</div>

<!--
3 つ目。これが学びとして一番大きかった。GitHub App の install 先を選ぶ画面で、jw-machine のような個人アカウントにインストールしちゃうと、そのアカウントから見える全リポで App が使えるんですよ。動くは動くんですけど、App の権限が machine user の collaborator 状況に従属することになる。本来は org の Selected repositories で対象リポを指定するのが正解で、こうすると App 単体で「このリポでしか動かない」が明示できる。設定画面の 1 ステップで security の固さが変わる。
-->

---
layout: center
---

# まとめ

- 自動化を 1 アカウントで完結させようとすると、branch protection と GitHub の仕様で詰む
- 個人 PAT も新規 machine user も避けたいなら、残るのは **App**
- **用途を絞れば、社内前例なしの技術でも合意できる**
- App と machine user は別アクター、権限も別管理にする

<div class="mt-8 text-xl p-4 border-l-4 border-amber-800 bg-amber-100/60 text-amber-900 font-bold">
新しい技術を入れるなら、最小スコープで前例を作ろう
</div>

<!--
まとめです。1 アカウントでは詰む。個人 PAT も machine user 増やすのも嫌なら App。社内に前例がなくても、用途を絞れば合意できる。そして App と machine user は権限を絡めずに別管理にする。新しい技術を入れるときは、まず最小スコープで前例を作ると通りやすい、というのが今回の一番の学びです。
-->

---
layout: section
---

# 付録 (時間余ったら / Q&A 用)

---

# 付録 A — 個人で GitHub App を作る 5 ステップ

1. GitHub → Settings → **Developer settings** → GitHub Apps → New
2. 名前 / 権限 (Pull requests R/W など) を選ぶ
3. **Webhook は不要なら Active を外す** (個人用途では大体不要)
4. private key (.pem) を生成 → ダウンロード
5. Install App → 自分のアカウント or org にインストール → リポ選択

<div class="mt-4 p-3 border-l-4 border-amber-500 bg-amber-50 text-amber-900 text-sm">
workflow に <code>actions/create-github-app-token@v3</code> を入れて App ID + private key を Secrets に置けば完成
</div>

<!--
個人で GitHub App を作るのは思ってるより簡単で、5 ステップで終わります。Settings の Developer settings から作って、private key 落として、自分の好きなリポにインストール。これで終わり。
-->

---

# 付録 B — この構造、他にも使える 3 例

<div class="my-3 space-y-2 text-sm">
  <div class="border-2 border-amber-800 bg-white/70 rounded-md p-3 shadow">
    <div class="font-bold text-amber-900 mb-1">① Shared 型定義の配布 — OpenAPI / GraphQL / proto</div>
    <div class="text-xs text-amber-950 leading-relaxed">
      <strong>上流:</strong> schema 定義 (例: oven-webapp の OpenAPI) &nbsp;/&nbsp; <strong>下流へ:</strong> codegen した型を Web / iOS / Android に PR で配る<br>
      <strong>狙い:</strong> backend が schema を更新するだけで、全クライアントの型が自動追従する
    </div>
  </div>

  <div class="border-2 border-amber-800 bg-white/70 rounded-md p-3 shadow">
    <div class="font-bold text-amber-900 mb-1">② 設定ファイルの一元管理 — biome / CI / renovate</div>
    <div class="text-xs text-amber-950 leading-relaxed">
      <strong>上流:</strong> 組織標準リポ (<code>.biome.json</code> / <code>.github/workflows</code> / <code>renovate.json</code>) &nbsp;/&nbsp; <strong>下流へ:</strong> 設定ファイル本体を各リポに同期 PR<br>
      <strong>狙い:</strong> 標準を 1 箇所で更新 → 全リポに反映、組織のばらつき防止
    </div>
  </div>

  <div class="border-2 border-amber-800 bg-white/70 rounded-md p-3 shadow">
    <div class="font-bold text-amber-900 mb-1">③ 翻訳ファイルの sync — i18n / Lokalise</div>
    <div class="text-xs text-amber-950 leading-relaxed">
      <strong>上流:</strong> 翻訳ソース (Lokalise から pull した locale files) &nbsp;/&nbsp; <strong>下流へ:</strong> <code>locales/*.json</code> を各アプリリポに PR<br>
      <strong>狙い:</strong> 翻訳更新 → 13 言語が全アプリに自動反映、翻訳デプロイの手間ゼロ
    </div>
  </div>
</div>

<div class="mt-2 px-3 py-2 border-l-4 border-amber-800 bg-amber-100/60 text-sm text-amber-900">
  <strong>共通パターン:</strong> 「上流リポを更新 → 下流リポに自動 PR」が成立するもの全部 → 今回の <code>sync-head-to-dependents</code> workflow をテンプレ化できる
</div>

<!--
付録 B は時間が余ったら触れる枠です。今回の oven-docs と同じ「上流リポを更新したら下流リポに自動 PR」というパターンは、社内でもいろいろ転用できる、という話を 3 つ紹介しています。1 つ目が Shared 型定義の配布。OpenAPI とか GraphQL とか proto を上流に置いて、各クライアントに型コードを配る。2 つ目が biome や CI 設定の一元管理。組織標準を 1 箇所で書き換えるだけで全リポに反映。3 つ目が翻訳ファイルの sync。TimeTree は 13 言語対応してるので、翻訳が更新されるたびに各アプリに配る、というのが現実的にやりたい話です。今回の workflow をテンプレ化すれば全部応用できます。
-->

---

# 付録 C — 個人 PAT vs 個人 App

| 観点 | 個人 PAT | 個人 App |
|---|---|---|
| 作る手間 | 1分 | 5分 |
| トークン寿命 | 期限切れ運用が辛い | 1h 自動再発行 |
| commit author | 自分 | `your-app[bot]` |
| 自分の PR の approve | × | × (両方不可) |
| 他人に配れるか | × | ◎ (Marketplace) |

<div class="mt-4 p-3 border-l-4 border-amber-500 bg-amber-50 text-amber-900 text-sm">
自分用に閉じるなら PAT で十分。退職や横展開を見据えるなら App。
</div>

<!--
個人 PAT と個人 App の比較。自分用に閉じるなら PAT で十分なんですけど、App にする利点は寿命管理が楽なのと、人に配れること。Marketplace 公開もできるので、OSS の自動化に育てたいなら App ですね。
-->

---

# 付録 D — 参考リンク

- [actions/create-github-app-token](https://github.com/actions/create-github-app-token)
- [peter-evans/create-pull-request](https://github.com/peter-evans/create-pull-request)
- [GitHub Docs: About apps](https://docs.github.com/en/apps/overview)
- [GitHub Docs: Creating a GitHub App](https://docs.github.com/en/apps/creating-github-apps)

<!--
参考リンク集。create-github-app-token の README は読んでおくと App 周りの理解が一気に進みます。
-->

---
layout: center
class: text-center
---

# ご清聴ありがとうございました
