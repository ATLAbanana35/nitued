const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const wss = new WebSocket.Server({
  port: parseInt(process.argv[2]),
  host: "0.0.0.0",
});
const colliders = [];
const items = [];
const chests = [];

function getColliderById(id) {
  for (let index = 0; index < colliders.length; index++) {
    const element = colliders[index];
    if (element.id === id) {
      return index;
    }
  }
  return null;
}

wss.on("connection", (ws) => {
  console.log("Un client est connecté");
  const id = uuidv4();
  ws.id = id;
  ws.send(JSON.stringify({ to: "you", type: "setUID", data: id }));
  ws.send(JSON.stringify({ to: id, type: "setColliders", data: colliders }));
  ws.send(JSON.stringify({ to: id, type: "setChests", data: chests }));
  ws.send(JSON.stringify({ to: id, type: "setItems", data: items }));
  wss.clients.forEach((client) => {
    if (client !== ws && client.id !== "dead") {
      ws.send(JSON.stringify({ to: id, type: "newPlayer", data: client.id }));
    }
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ to: "every", type: "newPlayer", data: id }));
    }
  });

  ws.on("message", (message) => {
    const messagee = JSON.parse(message.toString());
    messagee["to"] = "replay";
    ws.send(JSON.stringify(messagee));

    if (JSON.parse(message.toString())["to"] === "relay") {
      if (JSON.parse(message.toString())["type"] === "setCollider") {
        console.log("New Collider!");
        colliders.push(JSON.parse(message.toString())["data"]);
        const messagee = {
          to: "replay",
          type: "setCollider",
          data: JSON.parse(message.toString())["data"],
        };
        ws.send(JSON.stringify(messagee));
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "setCollider",
                data: JSON.parse(message.toString())["data"],
              })
            );
          }
        });
      } else if (JSON.parse(message.toString())["type"] === "setChest") {
        chests.push(JSON.parse(message.toString())["data"]);
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "setChest",
                data: JSON.parse(message.toString())["data"],
              })
            );
          }
        });
      } else if (JSON.parse(message.toString())["type"] === "openChest") {
        chests.splice(
          chests.indexOf(JSON.parse(message.toString())["data"]) + 1,
          1
        );
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "openChest",
                data: JSON.parse(message.toString())["data"],
              })
            );
          }
        });
      } else if (JSON.parse(message.toString())["type"] === "removeCollider") {
        const index = getColliderById(
          JSON.parse(message.toString())["data"]["id"]
        );
        console.log(JSON.parse(message.toString())["data"]["id"], index);
        colliders.splice(index, 1);
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "removeCollider",
                data: JSON.parse(message.toString())["data"],
              })
            );
          }
        });
      } else if (JSON.parse(message.toString())["type"] === "setItem") {
        items.push(JSON.parse(message.toString())["data"]);
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "setItem",
                data: JSON.parse(message.toString())["data"],
              })
            );
          }
        });
      } else if (JSON.parse(message.toString())["type"] === "takeItem") {
        items.splice(
          items.indexOf(JSON.parse(message.toString())["data"]) + 1,
          1
        );
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "takeItem",
                data: JSON.parse(message.toString())["data"],
              })
            );
          }
        });
      } else if (JSON.parse(message.toString())["type"] === "updateCollider") {
        const index = getColliderById(
          JSON.parse(message.toString())["data"]["id"]
        );
        if (index !== null) {
          colliders[index].x = JSON.parse(message.toString())["data"].x;
          colliders[index].s = JSON.parse(message.toString())["data"].s;
          colliders[index].y = JSON.parse(message.toString())["data"].y;
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  to: "every",
                  type: "updateCollider",
                  data: JSON.parse(message.toString())["data"],
                })
              );
            }
          });
        }
      } else if (JSON.parse(message.toString())["type"] === "deadPlayer") {
        ws.id = "dead";
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                to: "every",
                type: "deadPlayer",
                data: id,
              })
            );
          }
        });
      }
    } else {
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    }
  });
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
  ws.on("close", () => {
    console.log("Un client s'est déconnecté");

    // Vérifier s'il y a encore des clients connectés
    if (
      [...wss.clients].every((client) => client.readyState !== WebSocket.OPEN)
    ) {
      console.log("Tous les clients sont déconnectés, fermeture du serveur...");
      delete_port(parseInt(process.argv[2]));
      wss.close();
      process.exit(0); // Fermer le processus Node.js
    }
  });
});

wss.on("error", (error) => {
  console.error("Erreur WebSocket:", error);
});

console.log("Serveur WebSocket en écoute sur le port 7000");
