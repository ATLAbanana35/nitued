function request(address, callback, POSTData) {
  const xml = new XMLHttpRequest();
  xml.open("POST", address);
  // xml.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xml.onload = () => {
    if (!xml.responseText.includes("OK")) {
      Swal.fire({
        icon: "error",
        title: "The server return error message: ",
        html:
          xml.responseText +
          "<br> <a href='index.html?force=true'>Re-Login</a>",
      });
    } else {
      if (xml.responseText.split("OK")[1]) {
        callback(xml.responseText.split("OK")[1]);
      } else {
        callback("OK");
      }
    }
  };
  xml.send(JSON.stringify(POSTData));
}
