---
title: "asdf update を再実装した話(紹介編)"
emoji: "🧰"
type: "tech"
topics: [asdf, shell, cli, oss]
published: true
---

[asdf](https://asdf-vm.com/)で複数のツールを管理していると、更新のたびにプラグインを更新し、新しいバージョンをインストールし、使用するバージョンを設定することになります。この手間をまとめたくて、[asdf-extras](https://github.com/eihu0F/asdf-extras)を作りました。

シェルの初期化を済ませると、次のコマンドでasdf本体・プラグイン定義・管理するツールを更新できます。

~~~bash
asdf update
~~~

この記事では、asdf-extrasの導入方法と、日常的なアップデートで使うコマンドを紹介します。すでにasdfを使っている方向けの内容です。

## 「更新」をひとまとまりにしたい

asdfでは、プラグイン定義の更新と、そのプラグインで管理するツールの更新は別の操作です。

たとえば、Node.jsのプラグイン定義を更新するには、次のコマンドを使います。

~~~bash
asdf plugin update nodejs
~~~

これだけで、インストール済みのNode.jsまで新しくなるわけではありません。ツールを更新するには、更新先のバージョンを決めてインストールし、`.tool-versions`へ設定する操作も必要です。複数のツールを更新するなら、それぞれについて繰り返します。

asdf-extrasで減らしたかったのは、この一連の操作の手間です。プラグイン定義の更新、ツールのインストール、使用バージョンの設定を`asdf update`からまとめて行えるようにしました。

なお、0.15以前のasdfにも`asdf update`はありましたが、これはasdf本体を更新するコマンドでした。[0.16への移行時に削除されています](https://asdf-vm.com/guide/upgrading-to-v0-16.html#asdf-update-command-has-been-removed)。タイトルでは「再実装」としていますが、旧コマンドと同じ仕様を復元したものではありません。

## 導入する

### 前提

asdf 0.16.0以降がセットアップ済みであることを前提にします。`bash`、`curl`、`tar`なども必要です。asdf本体のスタンドアロン実行ファイルを更新する場合は、追加で`jq`と、`sha256sum`または`shasum`を使います。

以下ではBashとZshの設定例を載せます。Fish、Elvish、Nushellにも対応していますが、読み込み方や必要なシェルのバージョンは[README](https://github.com/eihu0F/asdf-extras#quick-start)を参照してください。

### プラグインを追加して、asdf-extrasをインストールする

~~~bash
asdf plugin add asdf-extras https://github.com/eihu0F/asdf-extras.git
asdf cmd asdf-extras install asdf-extras latest
~~~

asdf-extras自身もasdfでバージョン管理します。一行目がプラグインの追加、二行目がCLIのインストールと、ホームディレクトリのバージョン設定ファイル（通常は`~/.tool-versions`）への反映です。ここでいうバージョン設定は、`~/.bashrc`や`~/.zshrc`などのシェル設定とは別のものです。まだCLIを実行できない段階なので、二行目はプラグイン経由の`asdf cmd`から呼び出しています。

インストール後は、次のコマンドでヘルプを確認できます。

~~~bash
asdf-extras --help
~~~

### シェルを初期化する

Bashでは、次の行を`~/.bashrc`へ追加し、現在のシェルでも実行します。

~~~bash
eval "$(asdf-extras init bash)"
~~~

Zshでは、`~/.zshrc`へ次の行を追加します。

~~~zsh
eval "$(asdf-extras init zsh)"
~~~

既存のasdfやシェルフレームワークの補完設定がある場合は、その後に置いてください。初期化にはasdf-extrasの補完設定も含まれます。

初期化後は、`asdf update`などの拡張コマンドを普段の`asdf`から使えます。通常の`asdf install`や`asdf list`などは、元のasdfへ渡します。asdf本体の実行ファイルを書き換えてコマンドを追加する仕組みではありません。

まずはヘルプを確認してみてください。

~~~bash
asdf update --help
~~~

シェルの初期化をせずに使うこともできます。その場合は、`asdf-extras update nodejs`のように`asdf-extras`を直接呼び出します。

## 更新したい対象を選ぶ

### 一つのツールを更新する

~~~bash
asdf update nodejs
~~~

Node.jsのプラグイン定義を更新してから、更新先をインストールし、`~/.tool-versions`に設定します。更新先の既定値は`latest`です。環境変数で既定値を変更することもできます。

`--home`（既定）の更新では、インストールと設定の反映を確認できた後に、以前`~/.tool-versions`に設定されていたバージョンを削除します。インストールや設定の反映に失敗した場合は、以前のインストールを残します。

**`~/.tool-versions`を対象とする更新で削除される旧バージョンを、別のプロジェクトが使っていることもあります。** プロジェクトで旧バージョンを引き続き使う場合は、後述する`--local`や`--parent`を使ってください。

更新先を指定することもできます。

~~~bash
asdf update nodejs 24.11.0
~~~

この例のバージョン番号は、コマンドの書き方を示すものです。必要なバージョンに置き換えてください。

### asdf本体を含めてまとめて更新する

~~~bash
asdf update
~~~

引数なしの実行は`asdf update --all`と同じで、次の三つを更新対象にします。

1. asdf本体
2. インストール済みプラグインの定義
3. 各プラグインで管理するツールのバージョン

対象のツールをインストールし、`~/.tool-versions`へ反映します。`~/.tool-versions`に書かれたプラグインだけに絞るのではなく、インストール済みプラグインを処理する点にも注意してください。

asdf本体の更新方法は導入方法によって異なります。Homebrew管理の実行ファイルなら`brew upgrade asdf`を使い、条件を満たすホーム配下のスタンドアロン実行ファイルなら公式リリースから更新します。それ以外のパッケージ管理方法や配置では、[独自の更新スクリプトの設定](https://github.com/eihu0F/asdf-extras#updating-asdf-itself)が必要です。

asdf本体は普段のパッケージマネージャーで更新し、プラグイン定義とツールだけをまとめて更新したい場合は、次のように対象を選べます。

~~~bash
asdf update --plugin --version
~~~

主な組み合わせは次のとおりです。

| コマンド | 更新するもの |
| --- | --- |
| `asdf update` | asdf本体・プラグイン定義・ツール |
| `asdf update --asdf` | asdf本体のみ |
| `asdf update --plugin` | プラグイン定義のみ。`asdf plugin update --all`とほぼ同じ用途 |
| `asdf update --version nodejs` | Node.jsのバージョンのみ。プラグイン定義は更新しない |
| `asdf update --plugin --version` | プラグイン定義とツール |

一括更新中に失敗した対象があっても、残りの更新は続けます。最新版を解決できないプラグインも、エラーを報告して次へ進みます。失敗が一つでもあれば、コマンド全体は非ゼロの終了ステータスを返します。

## 更新先の系列を決める（`--use-latest`）

毎回すべてを最新版にするのではなく、「Node.jsは24系」「JavaはOpenJDK」のように、更新先の系列を決めたい場合もあります。`--use-latest`を付けると、バージョン引数を完全なバージョン番号ではなく、`asdf latest`に渡すプレフィックスとして扱います。

~~~bash
# Node.jsの24系で利用可能な最新版へ更新
asdf update --use-latest nodejs 24

# openjdkで始まる候補から最新版を選んで更新
asdf update --use-latest java openjdk
~~~

Javaのように候補に複数のディストリビューションが含まれるプラグインでは、どの候補から最新版を選ぶか指定しておくと便利です。

毎回オプションを書かずに済むよう、プラグインごとの既定値も設定できます。たとえば、次の二行を`~/.bashrc`や`~/.zshrc`など、シェルの起動時に読み込む設定へ追加します。

~~~bash
export ASDF_EXTRAS_UPDATE_USE_LATEST_JAVA=1
export ASDF_EXTRAS_UPDATE_DEFAULT_LATEST_PREFIX_JAVA=openjdk
~~~

この設定を読み込んだ後は、次のコマンドで`openjdk`をプレフィックスとして最新版を解決し、Javaを更新できます。

~~~bash
asdf update java
~~~

Javaだけの更新に限らず、引数なしの`asdf update`でJavaを処理するときにも、この設定が使われます。設定ファイルは`~/.tool-versions`ではなく、上記の環境変数を渡すためのシェル設定です。

主な環境変数は次のとおりです。

| 環境変数 | 用途 |
| --- | --- |
| `ASDF_EXTRAS_UPDATE_USE_LATEST` | プレフィックスから最新版を解決するモードを全体で有効にする |
| `ASDF_EXTRAS_UPDATE_USE_LATEST_<PLUGIN>` | プラグイン別にモードを指定する。`1`で有効、`0`で無効 |
| `ASDF_EXTRAS_UPDATE_DEFAULT_LATEST_PREFIX` | このモードで使う既定のプレフィックス |
| `ASDF_EXTRAS_UPDATE_DEFAULT_LATEST_PREFIX_<PLUGIN>` | プラグイン別の既定のプレフィックス |

`<PLUGIN>`にはプラグイン名を大文字にし、英数字以外を`_`に置き換えた名前を使います。Javaなら`JAVA`です。プラグイン別の設定は、全体の設定より優先されます。プレフィックスを指定しなければ、`asdf latest <plugin>`をプレフィックスなしで呼び出します。

一方、特定のバージョン番号を既定の更新先にしたい場合は、`ASDF_EXTRAS_UPDATE_DEFAULT_VERSION`または`ASDF_EXTRAS_UPDATE_DEFAULT_VERSION_<PLUGIN>`を使います。通常のバージョン指定と、`--use-latest`用のプレフィックスの既定値は別々に設定できます。指定できるプレフィックスと最新版の選び方は、それぞれのプラグインに依存します。

## プロジェクト単位で更新する

`~/.tool-versions`ではなく、今いるプロジェクトの設定を更新したい場合は`--local`を使います。

~~~bash
asdf update --local nodejs
~~~

プラグイン定義を更新して、Node.jsの更新先をインストールし、カレントディレクトリの`.tool-versions`へ設定します。この場合、以前のバージョンは削除しません。

プラグイン名を省略すると、その設定ファイルに書かれたツールを更新します。

~~~bash
asdf update --local
~~~

一括更新では対象の設定ファイルが必要です。ファイルが存在しない場合はエラーになります。

サブディレクトリから、親ディレクトリにある設定を更新したい場合は`--parent`です。

~~~bash
asdf update --parent nodejs
~~~

設定先と、更新後の旧バージョンの扱いを並べると、次のようになります。

| オプション | 設定先 | 更新前のバージョン |
| --- | --- | --- |
| `-u` / `--home`（既定） | ホームディレクトリの`~/.tool-versions` | 更新成功後に削除 |
| `--local` | カレントディレクトリの設定ファイル | 残す |
| `-p` / `--parent` | 親をたどって最初に見つかる既存の設定ファイル | 残す |

これらのスコープは同時に指定できません。`--parent`では親側に既存の設定ファイルが必要です。設定ファイル名は通常`.tool-versions`ですが、`ASDF_DEFAULT_TOOL_VERSIONS_FILENAME`を設定している場合はその名前を使います。

なお、`~/.tool-versions`を書き換えても、プロジェクト側の設定や環境変数が優先されることがあります。設定後の確認には`asdf current`を使ってください。

## インストール後の設定もまとめる

更新以外に、指定バージョンのインストールと設定をまとめる操作も用意しています。

~~~bash
# インストールして ~/.tool-versions へ反映
asdf install -u nodejs 24.11.0

# インストールしてカレントディレクトリの設定へ反映
asdf install --local nodejs 24.11.0

# インストールして親ディレクトリの既存の設定へ反映
asdf install -p nodejs 24.11.0
~~~

この`install`では、以前のバージョンを削除しません。スコープ指定のない通常の`asdf install`は、初期化後もasdf本来の動作です。

### インストール時の環境変数とフックを設定する

ツールによっては、ビルド時の環境変数や事前処理も決めておきたいことがあります。asdf-extrasでは、`ASDF_EXTRAS_INSTALL_ENV_FUNCTION_<PLUGIN>`で指定した関数を、インストール前に呼び出せます。関数はBashから引き継ぐ方法と、プラグイン別の環境ファイルで定義する方法があります。

環境ファイルはasdf-extras側のBashで`source`します。`export CC=clang`のようなPOSIX準拠の記述も使えますが、読み込み先に合わせてBashの構文で書くことを推奨します。普段使っているシェルがBashである必要はありません。

注意したいのは、**関数名を環境変数で渡すことと、関数本体をBashへ引き継ぐことは別**という点です。Zsh、Fish、Elvish、Nushellなどで定義した関数やカスタムコマンドは、関数名を環境変数に設定しても、asdf-extras側のBashからは呼び出せません。また、関数定義や環境変数の設定構文もシェルごとに異なるため、以下の`~/.bashrc`向けの例をそのまま他のシェルの起動設定へ書くことはできません。

普段のシェルがBashなら、`~/.bashrc`などに定義した関数を使う方法もあります。必要なのは、フックを実行するBashからその関数を参照できることです。次は、`export -f`で関数の引き継ぎを明示する設定例です。`clang`が使える環境を想定しているので、内容は自分のビルド環境に合わせてください。

~~~bash
nodejs_build_env() {
    export CC=clang
    export CXX=clang++
}
export -f nodejs_build_env
export ASDF_EXTRAS_INSTALL_ENV_FUNCTION_NODEJS=nodejs_build_env
~~~

`export -f`は関数本体を子プロセスのBashへ引き継ぐための指定で、もう一方の`export`は呼び出す関数名を渡すための指定です。起動設定や実行経路によって、すでにフック側から関数を参照できる場合は、追加の`export -f`なしで動作することもあります。`.bashrc`に書いた関数が常に自動で読み込まれると想定せず、フックを実行するBashから参照できるかを確認してください。

Bash以外のシェルを使っている場合は、次のように環境ファイル内で関数を定義できます。こちらは普段のシェルから関数本体を引き継ぐ必要がありません。

環境ファイルの既定の配置先は、`~/.asdf/asdf-extras/install/env/<plugin>.env`です。`ASDF_DATA_DIR`を設定している場合は、`~/.asdf`の部分をそのディレクトリに読み替えてください。必要なディレクトリと`nodejs.env`をエディタなどで作成し、次の内容を保存します。これは起動中のシェルへ入力するコマンドではなく、Bashが読み込むファイルの内容です。Nushellなどを使っていても、ファイル内はこの構文で記述します。

~~~bash
nodejs_build_env() {
    export CC=clang
    export CXX=clang++
}
ASDF_EXTRAS_INSTALL_ENV_FUNCTION_NODEJS=nodejs_build_env
~~~

この例では、関数本体と、呼び出す関数名の指定を同じ環境ファイルに書いています。ファイルを読み込んだ後に関数名を取得するため、この指定も有効です。同じBash内で参照するので、関数名の変数を`export`する必要もありません。

環境変数の設定だけで済む場合は、関数を用意せず、環境ファイルへ直接`export CC=clang`などと書けば十分です。関数は、引数のプラグイン名やバージョンに応じて処理を変えたい場合などに使えます。

この状態でextras経由のインストールを行うと、`nodejs.env`を読み込んでから`nodejs_build_env`を呼び出し、その環境でインストールします。関数には、第一引数にプラグイン名、第二引数に解決済みのバージョンが渡されます。

~~~bash
asdf install -u nodejs 24.11.0
~~~

**どちらの方法も、`update`のインストール処理で使われます。** 次のような個別更新や一括更新でも、Node.jsのインストールが必要になれば、設定したフックが呼び出されます。

~~~bash
asdf update nodejs
asdf update --plugin --version
~~~

関連する設定は次のとおりです。

| 環境変数 | 用途 |
| --- | --- |
| `ASDF_EXTRAS_INSTALL_ENV_DIR` | 環境ファイルを置くディレクトリを変更する |
| `ASDF_EXTRAS_INSTALL_ENV_FILE_<PLUGIN>` | プラグイン別に環境ファイルを指定する |
| `ASDF_EXTRAS_INSTALL_ENV_FUNCTION_<PLUGIN>` | プラグイン別に呼び出す関数名を指定する |
| `ASDF_EXTRAS_INSTALL_ENV_FUNCTION` | プラグイン別の関数指定がない場合に使う共通の関数名 |

`<PLUGIN>`の命名方法は更新先の設定と同じです。共通関数はプラグイン別関数の代わりに使うもので、両方を順番に呼ぶものではありません。関数を使わず、環境ファイルへ直接`export`を書いておくこともできます。

この仕組みが適用されるのは、スコープ付きの`asdf install`、直接の`asdf-extras install`、`update`内のインストールです。通常の`asdf install`には適用されません。また、すでに設定・インストール済みで処理を省略する場合、フックも呼び出しません。詳しくは[インストール時の環境変数とフックの仕様](https://github.com/eihu0F/asdf-extras#install-time-environment-hooks)を参照してください。

## ほかにできること

`~/.tool-versions`にないバージョンを削除する`asdf-extras prune`も用意しています。

`prune`の基準は`~/.tool-versions`であり、各プロジェクトの設定を走査して利用状況を調べるものではありません。プロジェクトで必要なバージョンも削除対象になり得ます。実行前に[pruneの仕様](https://github.com/eihu0F/asdf-extras#prune-unused-versions)を確認してください。

アップデートの手間を減らしたい方は、まず`asdf update --local nodejs`のように対象を絞って試してもらえればと思います。Javaなど更新先を選びたいツールにはプレフィックスを、インストールに準備が必要なツールには環境ファイルとフックを設定しておくと、日常の更新作業をまとめやすくなります。

実装の仕組みについては、別記事の[「asdf updateを再実装した話(設計編)」](https://zenn.dev/buffie/articles/94e055ccd77acd)で紹介しています。最新のオプションと詳しい動作は[asdf-extrasのREADME](https://github.com/eihu0F/asdf-extras#readme)を参照してください。
