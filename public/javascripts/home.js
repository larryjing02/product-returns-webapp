const reg_ticketnum = /^\d{7}$/;
const reg_mac = /^[0-9a-zA-Z]{12}$/;

(function () {
  window.addEventListener("load", init);

  /**
   * Loading UI and listeners once page finishes loading
   */
  function init() {

    const page1 = document.getElementById("ticket-input");
    const page2 = document.getElementById("ticket-query");
    page1.addEventListener("click", displayTicketInput);
    page2.addEventListener("click", displayTicketQuery);
    
    setInterval(refreshTime, 1000);

    const submit = document.querySelector("#frm1 form");
    const search1 = document.querySelector("#frm2 form");
    const search2 = document.querySelector("#frm3 form");
    submit.addEventListener("submit", function(form) {
      form.preventDefault();
      submitHandler();
    });
    search1.addEventListener("submit", function(form) {
      form.preventDefault();
      ticketSearchHandler();
    });
    search2.addEventListener("submit", function(form) {
      form.preventDefault();
      macSearchHandler();
    });
  }

  // Function to update displayed time
  function refreshTime() {
    const timeDisplay = document.getElementById("time");
    const dateString = new Date().toLocaleString();
    const formattedString = dateString.replace(", ", " - ");
    timeDisplay.textContent = formattedString;
  }

  function displayTicketInput() {
    this.classList.add("current");
    document.getElementById("ticket-query").classList.remove("current");
    document.getElementById("frm1").classList.remove("hidden");
    document.getElementById("frm2").classList.add("hidden");
    document.getElementById("frm3").classList.add("hidden");
    document.getElementById("infoListContainer").classList.add("hidden");

  }
  
  function displayTicketQuery() {
    this.classList.add("current");
    document.getElementById("ticket-input").classList.remove("current");
    document.getElementById("frm1").classList.add("hidden");
    document.getElementById("frm2").classList.remove("hidden");
    document.getElementById("frm3").classList.remove("hidden");
  }
  
  function submitHandler() {
    console.log("Form Submitted");

    let num = document.getElementById("ticket_num").value;
    let mac = document.getElementById("mac_addr").value;
    let dev = document.getElementById("device").value;

    console.log("Ticket Num: " + num);
    console.log("MAC Address: " + mac);
    console.log("Device Type: " + dev);

    // Checks length of inputted ticket number (must be 7)
    // Checks that inputted mac address is numeric
    if (!num.match(reg_ticketnum)) {
      alert("Please input a valid ticket number. Format: 1234567");
      return;
    }

    // Checks length of inputted MAC address (must be 12)
    // Checks that inputted MAC address is alphanumeric
    if (!mac.match(reg_mac)) {
      alert("Please input a valid MAC address. Format: AABBCCDDEEFF");
      return;
    }
    mac = mac.toUpperCase();

    queryDatabase(num, mac, dev);
  }

  function ticketSearchHandler() { 
    let num = document.getElementById("tic_num_search").value;

    // Checks length of inputted ticket number (must be 7)
    // Checks that inputted ticket number is numeric
    if (!num.match(reg_ticketnum)) {
      alert("Please input a valid Ticket Number. Format: 1234567");
      return;
    }

    searchDatabase(num);
  }

  function macSearchHandler() { 
    let mac = document.getElementById("mac_addr_search").value;

    // Checks length of inputted mac address (must be 12)
    // Checks that inputted mac address is alphanumeric
    if (!mac.match(reg_mac)) {
      alert("Please input a valid MAC Address. Format: AABBCCDDEEFF");
      return;
    }
    mac = mac.toUpperCase();

    searchDatabase(mac);
  }

  function queryDatabase(num, mac, dev) {
    console.log("Querying: ");
    let data = new FormData();
    data.append("num", num);
    data.append("mac", mac);
    data.append("dev", dev);

    fetch("query/", {
      method: "POST",
      body: data,
      credentials: "same-origin"
    }).then(statusCheck)
      .then((res) => res.text())
      .then((res) => {
        console.log(res);
        alert(res);
      })
      .catch((e) => console.log(e));
  }
  
  function searchDatabase(query) {
    console.log("Searching database for: " + query);
    let url = "search/"
    if (query.length == 7) {
      url += "ticket/" + query;
      document.getElementById("searchType").textContent = "Ticket Number Search Results:";
    } else {
      url += "mac/" + query;
      document.getElementById("searchType").textContent = "MAC Address Search Results:";
    }
    fetch(url, {
      mode: "cors",
      method: "GET",
      credentials: "same-origin",
    }).then(searchStatusCheck)
      .then(res => res.json())
      .then(data => {
        let list = document.getElementById("infoList");
        list.innerHTML = "";
        let li = document.createElement("li");
        if (data["mac_addr"].match(reg_mac)) {
          li.innerText = 'MAC Address: ' + data["mac_addr"];
        } else {
          li.innerText = 'Serial Number: ' + data["mac_addr"];
        }
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
        document.getElementById("infoListContainer").classList.remove("hidden");
    }).catch((e) => console.log(e));
  }

  async function statusCheck(res) {
    if (res.status === 400) {
      alert(await res.text());
    } else if (res.status < 200 || res.status > 304) {
      throw new Error(await res.text());
    }
    return res;
  }

  async function searchStatusCheck(res) {
    if (res.status === 400) {
      alert("Your search was not located in database!");
    } else if (res.status < 200 || res.status > 304) {
      throw new Error(await res.text());
    }
    return res;
  }

})();
