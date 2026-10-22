# Zenn CLI

記事の作成・プレビュー・公開方法は、[Zenn公式のCLIガイド](https://zenn.dev/zenn/articles/zenn-cli-guide)を参照してください。

## 下書き

- [asdf-extrasを作った理由と、shell functionで拡張する設計](articles/94e055ccd77acd.md)
- [asdf-extrasの品質をGitHub Actionsで確かめる](articles/asdf-extras-github-actions-quality.md)
- [AIとシェルツールを開発するために、リポジトリへ書いたルール](articles/asdf-extras-ai-development.md)

いずれも`published: false`の下書きです。ローカルで確認するには`npx zenn preview`を実行します。

## Copilot Canvas でプレビュー

[Zenn CLI Preview 拡張](.github/extensions/zenn-preview/extension.mjs)は、ローカルにインストールした Zenn CLI を使って記事を表示します。依存関係が未導入の場合は、先に `npm install` を実行してください。

Copilot の拡張を再読み込みした後、Canvas ID `zenn-articles-cli-preview` を入力 `{}` で開きます。特定の記事から開く場合は、`{"article":"asdf-extras-introduction"}` のように拡張子を除いたスラッグを指定します。

- 画面の選択欄で記事を切り替え、保存時の自動更新や「再読み込み」で表示を確認できます。
- エージェント向けアクションは `status`（起動状況・記事一覧）、`select-article`（記事選択）、`refresh`（再読み込み）です。
- 記事の正本は `articles/*.md` です。選択状態はパネルのメモリ内のみで保持し、同じパネルを開き直しても維持します。拡張の再起動を越えた保存はしません。
- Canvas と CLI は `127.0.0.1` の動的ポートで動作します。Zenn CLI がポート `0` を扱えないため、CLI には OS が割り当てた空きポートを指定します。明示的な Canvas 終了で、所有するサーバーと CLI を停止します。

拡張のテストは `node --test .github/extensions/zenn-preview/preview.test.mjs` で実行できます。
