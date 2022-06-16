const express = require('express');
const session = require('express-session');
const path = require('path');
const PropertiesReader = require("properties-reader");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const multer = require("multer");

//////////////////////////////////////////////////////////////////////

const app = express();

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer().none());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

const properties = PropertiesReader("conn.properties");
const INVALID_REQUEST = 400;
const SERVER_ERROR = 500;
const SERVER_ERROR_MSG = "An error occurred on the server. Try again later.";
const PARAM_ERROR_MSG = "Missing one or more of the required params.";


// Create connection to database
const pool = mysql.createPool({
  connectionLimit: properties.get("connectionlimit"),
  host: properties.get("server"),
  user: properties.get("username"),
  password: properties.get("password"),
  database: properties.get("database"),
  debug: false
});

console.log("Testing Environment Variables")
console.log(process.env.testkey)

//////////////////////////////////////////////////////////////////////

// http://localhost:3000/
app.get('/', function(request, response) {
	response.render('login', {
    title: 'Wyze Returns Demo'
  });
});

// http://localhost:3000/auth
app.post('/auth', async function(request, response) {
	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;

	// Ensure the input fields exists and are not empty
	if (username && password) {
		console.log("Attempting login: " + username);

    const selectQuery = "SELECT * FROM ?? WHERE ?? = ?;";
    const query = mysql.format(selectQuery, ["Users", "username", username])

    pool.query(query, async (err, data) => {
      if (err) {
          console.error(err);
          return;
      }
      if (await verify_login(password, data)) {
        request.session.loggedin = true;
        request.session.username = username;
        request.session.origin = data[0]["origin"];
        request.session.name = data[0]["name"];
        request.session.permissions = data[0]["user_permissions"];
        // Redirect to home page
        return response.redirect('/home');
      } else {
        return response.send('Incorrect Username and/or Password!');
      }
    });
	} else {
		return response.send('Please enter Username and Password!');
	}
});

// Returns whether or not the login was valid
async function verify_login(password, data) {
  // Check if data has anything in it first
  if (data.length === 0) {
    console.log("User doesn't exist!");
    return false;
  }
  try {
    const pass = data[0]["password"];
    // Extract salt from stored password
    const salt = pass.substring(0,29);
    // Compute new hash and compare
    const hash = await bcrypt.hash(password, salt);
    return (pass === hash);
  } catch (error) {
    console.log(error);
    return false;
  }
}

// http://localhost:3000/home
app.get('/home', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin) {
    response.render('home', {
      name: request.session.name,
      origin: request.session.origin
    });
	} else {
		// Not logged in
		response.send('Please login to view this page!');
	}
	response.end();
});

// http://localhost:3000/createauth
app.post('/createauth', async function(request, response) {
  if (request.session.permissions !== 1) {
    response.status(403);
    response.send("Must have administrator privileges!");
    response.end();
    return
  }

	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;
	let name = request.body.name;
	let origin = request.body.origin;
	let permission = request.body.permission;

  // Ensure the input fields exists and are not empty
  if (username && password && name && origin && permission) {
    console.log("Attempting to create user: " + username);

    // Hashes plaintext password and returns salted hash
    bcrypt.hash(password, 10, async (err, hash) => {
      if (err) {
        console.error(err);
        return;
      }
      // Store hash in database
      const selectQuery = "INSERT INTO ?? VALUES (?, ?, ?, ?, ?);";
      const query = mysql.format(selectQuery, ["Users", username, hash, origin, name, permission]);
  
      pool.query(query, async (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        if (data.affectedRows === 1) {
          // Redirect to home page
          return response.redirect('/home');
        } else {
          return response.send('Failed to create new user!');
        }
      });
    });
  } else {
    return response.send('Please enter all fields!');
  }
});

// http://localhost:3000/create
app.get('/create', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin && request.session.permissions == 1) {
    response.render('create', {
      title: "Create New User",
    });
	} else {
    response.send('You must be logged in as an administrator to view this page!');
	}
	response.end();
});

// GET endpoint for submit query
app.post("/query", async (req, res) => {
  res.type("text");
  const mac = req.body.mac;
  const dev = req.body.dev;
  const num = req.body.num;
  if (mac && dev && num) {
    console.log("Attempting to query for: " + mac);
    try {
      const selectQuery = "SELECT COUNT(*) FROM MAC_Address WHERE mac_addr = ? OR ticket_number = ?;";
      let query = mysql.format(selectQuery, [mac, num]);
  
      pool.query(query, async (err, data) => {
        if (err) {
            console.error(err);
            res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
        } else {
          if (data[0]["COUNT(*)"] >= 1) {
            res.status(INVALID_REQUEST)
            res.send(`Ticket number ${num} or MAC Address ${mac} or was already found on the database!`);
          } else if (req.session.permissions > 2) {
            res.status(INVALID_REQUEST)
            res.send("Sorry, you do not have permission to write to the database.");
          } else {
            await add_mac(pool, mac, dev, num, req.session.origin, req.session.username);
            res.send(`Ticket ${num} has been added to the database.`)
          }
        }
      });
    } catch (error) {
      console.log(error);
      res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
    }
  } else {
    console.log("An invalid request was sent");
    res.status(INVALID_REQUEST).send(PARAM_ERROR_MSG);
  }
});

async function add_mac(pool, mac, dev, num, orig, user) {
  const selectQuery = `INSERT INTO ?? VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?);`
  const query = mysql.format(selectQuery, ["MAC_Address", mac, dev, num, orig, user]);
  // ello
  pool.query(query, async (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log("Add to database: " + mac + " : " + dev);
    }
  });      
}

// GET endpoint for search - Ticket Number
app.get("/search/ticket/:num", async (req, res) => {
  const num = req.params.num;
  console.log("Attempting to search for ticket: " + num);
  try {
    const selectQuery = "SELECT * FROM ?? WHERE ?? = ?;"
    const query = mysql.format(selectQuery, ["MAC_Address", "ticket_number", num]);
    pool.query(query, async (err, data) => {
      if (err) {
        console.error(err);
      } else {
        if (data.length === 0) {
          console.log("Ticket Number not found in database.")
          res.type("text");
          res.status(INVALID_REQUEST).send(PARAM_ERROR_MSG);
        } else {
          return res.json(data[0]);
        }
      }
    });
  } catch (error) {
    console.log(error);
    res.type("text");
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

// GET endpoint for search - MAC Address
app.get("/search/mac/:mac", async (req, res) => {
  const mac = req.params.mac;
  console.log("Attempting to search for mac: " + mac);
  try {
    const selectQuery = "SELECT * FROM ?? WHERE ?? = ?;"
    const query = mysql.format(selectQuery, ["MAC_Address", "mac_addr", mac]);
    pool.query(query, async (err, data) => {
      if (err) {
        console.error(err);
      } else {
        if (data.length === 0) {
          console.log("MAC Address not found in database.")
          res.type("text");
          res.status(INVALID_REQUEST).send(PARAM_ERROR_MSG);
        } else {
          return res.json(data[0]);
        }
      }
    });
  } catch (error) {
    console.log(error);
    res.type("text");
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

app.listen(process.env.PORT || 3000);