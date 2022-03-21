const reg = /^[0-9a-zA-Z]+$/;

(function () {
  window.addEventListener("load", init);

  /**
   * Loading UI and listeners once page finishes loading
   */
  function init() {
    const submit = document.querySelector(".btn");
    const search = document.querySelector(".search_btn");
    submit.addEventListener("click", function () {
      console.log("Form Submitted");

      let mac = document.getElementById("mac_addr").value;
      let dev = document.getElementById("device").value;

      console.log("MAC Address: " + mac);
      console.log("Device Type: " + dev);

      // Checks length of inputted mac address (must be 12)
      // Checks that inputted mac address is alphanumeric
      if (mac.length != 12 || !mac.match(reg)) {
        alert("Please input a valid MAC Address. Format: AABBCCDDEEFF");
        return;
      }
      mac = mac.toUpperCase();

      queryDatabase(mac, dev);
    });

    search.addEventListener("click", function () { 
        let mac = document.getElementById("mac_addr_search").value;
  
        // Checks length of inputted mac address (must be 12)
        // Checks that inputted mac address is alphanumeric
        if (mac.length != 12 || !mac.match(reg)) {
          alert("Please input a valid MAC Address. Format: AABBCCDDEEFF");
          return;
        }
        mac = mac.toUpperCase();
  
        searchDatabase(mac);
      });
  }
})();

function queryDatabase(mac, dev) {
  console.log("Querying: ");
  fetch("http://localhost:3000/query/" + mac + "/" + dev, {
    mode: "cors",
    method: "GET",
    credentials: "same-origin",
  })
    .then(statusCheck)
    .then((res) => res.text())
    .then((res) => {
      console.log(res), alert(res);
    })
    .catch((e) => console.log(e));
}

function searchDatabase(mac) {
    console.log("Search: ");
    fetch("http://localhost:3000/search/" + mac, {
      mode: "cors",
      method: "GET",
      credentials: "same-origin",
    })
      .then(statusCheck)
      .then((res) => res.text())
      .then((res) => {
        const data = JSON.parse(res);
        let list = document.getElementById("infoList");
        list.innerHTML = "";
        if (Object.keys(data).length === 0) {
            alert("MAC Address '" + mac + "' was not found.");
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
        li5.innerText = 'Process Time: ' + data["processtime"];
        list.appendChild(li5);
      })
      .catch((e) => console.log(e));
  }
  

async function statusCheck(res) {
  if (res.status < 200 || res.status > 304) {
    throw new Error(await res.text());
  }
  return res;
}
