const reg = /^[0-9a-zA-Z]+$/;

(function () {
  window.addEventListener("load", init);

  console.log("HELLO");

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
        console.log("Search");
  
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
  fetch("http://localhost:3000/" + mac + "/" + dev, {
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
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
      })
      .catch((e) => console.log(e));
  }
  

async function statusCheck(res) {
  if (res.status < 200 || res.status > 304) {
    throw new Error(await res.text());
  }
  return res;
}
