import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline";

export const selectOption = async (
  question: string,
  options: string[],
): Promise<string> => {
  let selectedIndex = 0;
  const rl = readline.createInterface({ input, output });

  // カーソルを非表示
  process.stdout.write("\x1B[?25l");

  function displayOptions() {
    // 現在の表示をクリア
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);

    console.log(question);
    options.forEach((option, index) => {
      const prefix = index === selectedIndex ? "> " : "  ";
      console.log(`${prefix}${index + 1}. ${option}`);
    });
  }

  return new Promise((resolve) => {
    displayOptions();

    // キー入力のハンドリング
    process.stdin.setRawMode(true);
    process.stdin.on("data", (data) => {
      const key = data.toString();

      if (key === "\u001B[A" && selectedIndex > 0) {
        // 上矢印
        selectedIndex--;
      } else if (key === "\u001B[B" && selectedIndex < options.length - 1) {
        // 下矢印
        selectedIndex++;
      } else if (key === "\r") {
        // Enterキー
        process.stdout.write("\x1B[?25h"); // カーソルを再表示
        rl.close();
        resolve(options[selectedIndex]);
        return;
      }

      displayOptions();
    });
  });
};
