---
title: "AIとシェルツールを開発するために、リポジトリへ書いたルール"
emoji: "🤖"
type: "tech"
topics: [ai, githubcopilot, shell, oss]
published: false
---

AIにコード変更を頼むとき、指示が会話だけにあると次の作業で抜け落ちます。[asdf-extras](https://github.com/eihu0F/asdf-extras)では、AI向けの作業ルールをリポジトリ内で管理しています。この記事では公開されている設定から読み取れる活用方法を紹介します。個々の変更を実際にAIが生成したかや、生成割合は、この設定だけでは判断できません。

## プロジェクト全体の判断基準を置く

[`.github/copilot-instructions.md`](https://github.com/eihu0F/asdf-extras/blob/main/.github/copilot-instructions.md)には、利用者への返答言語、成果物の言語、コミットメッセージ、PRタイトル、ブランチ運用、リリースの考え方が書かれています。たとえば利用者には利用者の言語で返し、ソースコードや文書などの成果物は明示的な指定がない限り英語にするルールです。

`fix`はパッチ、`feat`はマイナー、破壊的変更はメジャーのリリース意図として扱うことも明記されています。ランタイムの対象パスも示し、文書やCIだけの変更で意図しないリリースを起こさないようにしています。AIへの依頼をリポジトリの運用に合う変更へ絞るための情報です。

## シェル実装には専用のルールを置く

[シェル向けinstructions](https://github.com/eihu0F/asdf-extras/blob/main/.github/instructions/shell-implementation.instructions.md)は適用対象を`**/*.{sh,bash,zsh,ksh}`に絞り、変数展開の引用、破壊的操作の前のパス確認、POSIX向けスクリプトの互換性、`eval`の扱いなどを指定しています。

シェルでは、見た目には正しそうな変更でも、環境差やパス操作で問題が起きます。一般ルールとファイル種別ごとのルールを分けることで、変更対象に必要な注意点を伝えています。

## 手順は小さなスキルにする

`.github/skills/`には、編集前のブランチ確認、シェルのlint、タグとリリースページの作業に関する手順が置かれています。Copilot向けのプロジェクト指示は、編集前にブランチ確認を行い、シェル変更を終える前に指定バージョンのShellCheckとshfmtで検証するよう求めています。

さらに[`scripts/lint.bash`](https://github.com/eihu0F/asdf-extras/blob/main/scripts/lint.bash)と[回帰テスト群](https://github.com/eihu0F/asdf-extras/tree/main/scripts)があり、同じ検査をローカルと[GitHub Actions](https://github.com/eihu0F/asdf-extras/tree/main/.github/workflows)で実行できます。AIが提案した変更でも、人が書いた変更でも、確認する基準は同じです。

## まとめ

asdf-extrasで公開しているAI活用の中心は、リポジトリ固有の判断基準をファイルに残すことです。言語やPR運用は全体指示に、シェルの注意点は対象ファイル向けの指示に、繰り返す確認作業はスキルと実行可能な検査に置いています。
