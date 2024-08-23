const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { hostname } = require("os");
// Définir le port sur lequel le serveur va écouter
const port = 3000;
function get_users() {
  return JSON.parse(
    fs.readFileSync("../data/users.json", { encoding: "utf-8" })
  );
}
function check_username(chars) {
  var format = /^[a-zA-Z0-9_-]+$/;
  return format.test(chars);
}
function set_users(users_array) {
  fs.writeFileSync("../data/users.json", JSON.stringify(users_array));
}
function set_matches(users_array) {
  fs.writeFileSync("../data/matches.json", JSON.stringify(users_array));
}
function get_item_shop() {
  return fs.readFileSync("../data/shop.json", { encoding: "utf-8" });
}
function get_ports() {
  return fs.readFileSync("../data/ports.json", { encoding: "utf-8" });
}
function set_ports(users_array) {
  fs.writeFileSync("../data/ports.json", JSON.stringify(users_array));
}
function delete_port(port) {
  const ports = JSON.parse(get_ports());
  ports.splice(ports.indexOf(port), 1);
  set_ports(ports);
}
let ports = [];
set_ports(ports);
let users = get_users();
let matches = [];
set_matches(matches);
// Fonction pour récupérer les données POST
function get_POST_data(req) {
  return new Promise((resolve, reject) => {
    if (req.method !== "POST") {
      resolve(null);
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsedData = JSON.parse(body);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

// Fonction pour obtenir le chemin du fichier à servir
function get_filepath(reqUrl) {
  const parsedUrl = url.parse(reqUrl);
  let pathname = `.${parsedUrl.pathname}`;
  const ext = path.extname(pathname);

  if (ext === "") {
    pathname += ".html";
  }

  return pathname;
}
function choose(choices) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}
function range(min, max, interval = 1) {
  const length = (max - min) / interval + 1;
  const arr = Array.from({ length }, (_, i) => min + i * interval);
  return arr;
}
function getRandomAvilablePort() {
  const portarray = range(26490, 26999);
  JSON.parse(get_ports()).forEach((match) => {
    array.splice(array.indexOf(match), 1);
  });
  const choosedPort = choose(portarray);
  let x = JSON.parse(get_ports());
  x.push(choosedPort);
  set_ports(x);
  return choosedPort;
}
// Créer le serveur
const server = http.createServer(async (req, res) => {
  const filepath = get_filepath(req.url);

  // Si la requête est un GET pour récupérer un fichier
  if (req.method === "GET") {
    fs.readFile(filepath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }
      res.writeHead(200, { "Access-Control-Allow-Origin": "*" });

      const ext = path.extname(filepath).toLowerCase();
      const contentType = getContentType(ext);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  }

  // Si la requête est un POST pour récupérer les données envoyées
  else if (req.method === "POST") {
    try {
      const postData = await get_POST_data(req);
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      });
      if (postData["type"]) {
        if (postData["type"] === "createAccount") {
          if (postData["username"] && postData["password"]) {
            if (check_username(postData["username"])) {
              if (!users[postData["username"]]) {
                users[postData["username"]] = {
                  skins: ["default"],
                  ncoins: 0,
                  password: postData["password"],
                };
                set_users(users);
                res.end("OK");
              } else {
                res.end("Account username already exists");
              }
            } else {
              res.end("Username MUST conaint a-z A-Z 0-10 - _");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "get_item_shop") {
          res.end("OK" + get_item_shop());
        } else if (postData["type"] === "get_user_infos") {
          if (postData["username"] && postData["password"]) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                const user = JSON.parse(
                  JSON.stringify(users[postData["username"]])
                );
                delete user["password"];
                res.end("OK" + JSON.stringify(user));
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "delete_account") {
          if (postData["username"] && postData["password"]) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                delete users[postData["username"]];
                set_users(users);
                res.end("OK");
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "buy_item") {
          if (
            postData["username"] &&
            postData["password"] &&
            postData["skin"]
          ) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                const item_shop = JSON.parse(
                  fs.readFileSync("../data/shop.json", { encoding: "utf-8" })
                );
                if (item_shop[postData["skin"]]) {
                  let error = "no";
                  users[postData["username"]].skins.forEach((skin) => {
                    if (skin === postData["skin"]) {
                      error = "You already buyed this item";
                    }
                  });
                  if (error === "no") {
                    if (
                      item_shop[postData["skin"]] <=
                      users[postData["username"]].ncoins
                    ) {
                      users[postData["username"]].ncoins -=
                        item_shop[postData["skin"]];
                      users[postData["username"]].skins.push(postData["skin"]);
                      set_users(users);
                      res.end("OK");
                    } else {
                      res.end("You don't have enough money");
                    }
                  } else {
                    res.end(error);
                  }
                } else {
                  res.end("Object does not exists");
                }
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "win") {
          if (postData["username"] && postData["password"]) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                users[postData["username"]].ncoins += 100;
                set_users(users);
                res.end("OK");
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "loose") {
          if (postData["username"] && postData["password"]) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                users[postData["username"]].ncoins += 50;
                set_users(users);
                res.end("OK");
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "createMatch") {
          if (postData["username"] && postData["password"]) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                const index =
                  matches.push({
                    pid: null,
                    port: null,
                    clients: [],
                    host: postData["username"],
                    leftSeconds: 30,
                    started: false,
                    err_no_enough_players: true,
                  }) - 1;
                set_matches(matches);
                const interval = setInterval(() => {
                  matches[index].leftSeconds -= 1;
                  set_matches(matches);
                }, 1000);
                setTimeout(() => {
                  matches[index].leftSeconds -= 1;

                  clearInterval(interval);
                  matches[index].started = true;
                  if (!matches[index].err_no_enough_players) {
                    matches[index].port = getRandomAvilablePort();
                    const ChildProcess = exec(
                      "node ../server.js " + matches[index].port
                    );
                    if (ChildProcess.pid) {
                      matches[index].pid = ChildProcess.pid;
                    }
                  }
                  set_matches(matches);
                  setTimeout(() => {
                    matches.splice(index - 1, 1);
                    set_matches(matches);
                  }, 10000);
                }, 30000);
                res.end("OK" + index);
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "getMatchInfos") {
          if (postData["matchID"]) {
            if (!isNaN(parseInt(postData["matchID"]))) {
              if (matches[parseInt(postData["matchID"])]) {
                res.end(
                  "OK" + JSON.stringify(matches[parseInt(postData["matchID"])])
                );
              } else {
                res.end("Match don't exists (maybe already started)");
              }
            } else {
              res.end("Malformed POST data");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "matchExists") {
          if (postData["matchID"]) {
            if (!isNaN(parseInt(postData["matchID"]))) {
              if (matches[parseInt(postData["matchID"])]) {
                res.end("OK" + "true");
              } else {
                res.end("OK" + "false");
              }
            } else {
              res.end("Malformed POST data");
            }
          } else {
            res.end("Malformed POST data");
          }
        } else if (postData["type"] === "joinMatch") {
          if (
            postData["username"] &&
            postData["password"] &&
            postData["matchID"]
          ) {
            if (users[postData["username"]]) {
              if (
                users[postData["username"]]["password"] === postData["password"]
              ) {
                if (!isNaN(parseInt(postData["matchID"]))) {
                  if (matches[parseInt(postData["matchID"])]) {
                    matches[parseInt(postData["matchID"])].clients.push(
                      users[postData["username"]]
                    );
                    matches[
                      parseInt(postData["matchID"])
                    ].err_no_enough_players = false;
                    res.end("OK");
                  } else {
                    res.end("Match don't exists (maybe already started)");
                  }
                } else {
                  res.end("Malformed POST data");
                }
              } else {
                res.end("Wrong password");
              }
            } else {
              res.end("Account does not exists (maby deleted)?");
            }
          } else {
            res.end("Malformed POST data");
          }
        }
      } else {
        res.end("Malformed POST data");
      }
    } catch (error) {
      console.log(error);
      res.end("Error processing POST data");
    }
  } else if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*",
    });
    res.end("200 OK");
  } else {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
  }
});

// Fonction pour déterminer le type de contenu à partir de l'extension de fichier
function getContentType(ext) {
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".woff": "application/font-woff",
    ".ttf": "application/font-ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "application/font-otf",
    ".wasm": "application/wasm",
  };

  return types[ext] || "application/octet-stream";
}

// Démarrer le serveur et l'écouter sur le port défini
server.listen(port, "0.0.0.0");
