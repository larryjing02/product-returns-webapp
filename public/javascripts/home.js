const reg_ticketnum = /^\d{7}$/;
const reg_mac = /^[0-9a-zA-Z]{12}$/;

(function () {
  window.addEventListener("load", init);

  /**
   * Loading UI and listeners once page finishes loading
   */
  function init() {
    const submit = document.querySelector(".btn");
    const search1 = document.querySelector(".search_btn_1");
    const search2 = document.querySelector(".search_btn_2");

    submit.addEventListener("click", function () {
      console.log("Form Submitted");

      let mac = document.getElementById("mac_addr").value;
      let dev = document.getElementById("device").value;
      let num = document.getElementById("ticket_num").value;

      console.log("MAC Address: " + mac);
      console.log("Device Type: " + dev);
      console.log("Ticket Num: " + num);

      // Checks length of inputted mac address (must be 12)
      // Checks that inputted mac address is alphanumeric
      if (!mac.match(reg_mac)) {
        alert("Please input a valid MAC Address. Format: AABBCCDDEEFF");
        return;
      }
      mac = mac.toUpperCase();

      queryDatabase(mac, dev, num);
    });

    search1.addEventListener("click", function () { 
      let num = document.getElementById("tic_num_search").value;

      // Checks length of inputted ticket number (must be 7)
      // Checks that inputted ticket number is numeric
      if (!num.match(reg_ticketnum)) {
        alert("Please input a valid Ticket Number. Format: 1234567");
        return;
      }

      searchDatabase(num);
    });

    search2.addEventListener("click", function () { 
      let mac = document.getElementById("mac_addr_search").value;

      // Checks length of inputted mac address (must be 12)
      // Checks that inputted mac address is alphanumeric
      if (!mac.match(reg_mac)) {
        alert("Please input a valid MAC Address. Format: AABBCCDDEEFF");
        return;
      }
      mac = mac.toUpperCase();

      searchDatabase(mac);
    });
  }
})();

function queryDatabase(mac, dev, num) {
  console.log("Querying: ");
  fetch("http://localhost:3000/query/" + mac + "/" + dev + "/" + num, {
    mode: "cors",
    method: "GET",
    credentials: "same-origin",
  }).then(statusCheck)
    .then((res) => res.text())
    .then((res) => {
      console.log(res), alert(res);
    })
    .catch((e) => console.log(e));
}

function searchDatabase(query) {
  console.log("Search: ");
  let url = "http://localhost:3000/search/"
  if (query.length == 7) {
    url += "ticket/" + query;
  } else {
    url += "mac/" + query;
  }
  fetch(url, {
    mode: "cors",
    method: "GET",
    credentials: "same-origin",
  }).then(statusCheck)
    .then((res) => res.text())
    .then((res) => {
      const data = JSON.parse(res);
      let list = document.getElementById("infoList");
      list.innerHTML = "";
      if (Object.keys(data).length === 0) {
          if (query.length == 7) {
            alert("Ticket Number '" + query + "' was not found.");
          } else {
            alert("MAC Address '" + query + "' was not found.");
          }
          return;
      }

      // TODO: Fix formatting
      let li = document.createElement("li");
      li.innerText = 'MAC Address: ' + data["mac_addr"];
      list.appendChild(li);
      let li2 = document.createElement("li");
      li2.innerText = 'Device Type: ' + data["product_type"];
      list.appendChild(li2);
      let li3 = document.createElement("li");
      li3.innerText = 'Ticket Number: ' + data["ticket_number"];
      list.appendChild(li3);
      let li4 = document.createElement("li");
      li4.innerText = 'Origin Center: ' + data["origin"];
      list.appendChild(li4);
      let li5 = document.createElement("li");
      li5.innerText = 'Agent Username: ' + data["agent_username"];
      list.appendChild(li5);
      let li6 = document.createElement("li");
      li6.innerText = 'Process Time: ' + data["processtime"];
      list.appendChild(li6);
  }).catch((e) => console.log(e));
}
  

async function statusCheck(res) {
  if (res.status < 200 || res.status > 304) {
    throw new Error(await res.text());
  }
  return res;
}
