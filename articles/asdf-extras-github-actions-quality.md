---
title: "asdf-extrasの品質をGitHub Actionsで確かめる"
emoji: "✅"
type: "tech"
topics: [githubactions, asdf, shell, ci]
published: false
---

[asdf-extras](https://github.com/eihu0F/asdf-extras)は、CLI本体に加えてシェル初期化、補完、asdfプラグインとしてのインストールを持っています。GitHub Actionsでは、静的チェックと動作確認を分けて、利用者が通る経路を検証しています。

## Lint: シェルとワークフローを検査する

[`lint.yml`](https://github.com/eihu0F/asdf-extras/blob/main/.github/workflows/lint.yml)は`main`へのpushとプルリクエストで動きます。シェルのチェックは[`scripts/lint.bash`](https://github.com/eihu0F/asdf-extras/blob/main/scripts/lint.bash)へ集約し、ShellCheckとshfmtを実行します。ローカルでも同じスクリプトを呼べる形です。

別ジョブではactionlintを使い、GitHub Actionsのワークフロー定義を検査します。シェルコードとCI設定、それぞれに合った検査を置いています。

## Build: 利用経路ごとに回帰テストする

[`build.yml`](https://github.com/eihu0F/asdf-extras/blob/main/.github/workflows/build.yml)もpushとプルリクエストで実行されます。`plugin_test`ジョブはUbuntuとmacOSのマトリクスで、インストール、更新、prune、シェル初期化、補完、ヘルプの回帰テストを走らせます。最後に`asdf-vm/actions/plugin-test@v4`で、asdfプラグインとして導入し、`asdf-extras --help`を呼ぶ経路も確認します。

補完はElvishとNushellの専用ジョブでも検証します。それぞれのシェルをインストールして回帰テストを実行します。コマンド本体が動いても、`init`経由の振り分けや特定シェルの補完が壊れる可能性があるためです。

## PRの形式とリリースも自動化する

[`semantic-pr.yml`](https://github.com/eihu0F/asdf-extras/blob/main/.github/workflows/semantic-pr.yml)はConventional Commits形式のPRタイトルを検査し、単一コミットの検証も設定しています。`pull_request_target`で実行されますが、PR側のコードをチェックアウトして実行する構成ではありません。

[`release.yml`](https://github.com/eihu0F/asdf-extras/blob/main/.github/workflows/release.yml)は`main`へのpushまたは手動実行でrelease-pleaseを動かします。[設定ファイル](https://github.com/eihu0F/asdf-extras/blob/main/release-please-config.json)では、`.github/**`、`scripts/**`、READMEなどをリリース対象から除外しています。CIや文書だけの変更で実行部分のリリースが始まらないようにする設定です。

## まとめ

静的チェック、OSとシェルを分けた回帰テスト、プラグインとしての動作確認、PR形式とリリース管理を組み合わせています。小さなシェルツールでも、利用者が通る入口ごとに検証を置くと変更の影響を見つけやすくなります。
