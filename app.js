// the express server,app object, and port
import express from "express";
import pg from "pg";
import session from "express-session";
const app = express();
const port = 3000;

//code that lets server save who was logged in
app.use(session({
    secret: "blog-secret-key",
    resave: false,
    saveUninitialized: false
}));

//PostgreSQL database
const database = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Blogs_Database",
    password:"12345",
    port: 5432
});
database.connect();

// EJS/Middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"));


//homepage
app.get("/", login, async (req,res) => {
    //newest posts varaible
    const results = await database.query("SELECT * FROM blogs ORDER BY date DESC")

    //updates homepage with the newest posts array
    res.render("index", {posts: results.rows, user: req.session.user});
});

//log message of what port the server is running on
app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});

//code to run when request for post creation is made
app.post("/posts",login, async (req, res) => {
    //user variable
    const user = req.session.user;

    //
    await database.query("INSERT INTO blogs (creator_user_name, creator_name, title, body) VALUES ($1, $2, $3, $4)",
        [user.user_name, user.name, req.body.title, req.body.content]);

    //redirect back to homepage 
    res.redirect("/");
});

//route to edit forum if the post belongs to the user
app.get('/posts/:id/edit', login, async (req, res) => {
    //find post with matching id and ussername in array
    const results = await database.query("SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_name = $2",
        [req.params.id, req.session.user.user_name]);
    
    //if there are no rows, the blog is empty or doesnt belong to the user
    if (results.rows.length == 0)
    {
        return res.redirect("/");
    }

    //
    res.render('edit', {post: results.rows[0]});
});

//save editing changes made to post. user_name prevents unauthorized ediitng
app.post("/posts/:id", login, async (req, res) => {
    //update 
    await database.query("UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3 AND creator_user_name = $4",
        [req.body.title, req.body.content, req.params.id, req.session.user.user_name]);
    
    //    
    res.redirect("/");
});

//code to run when deleting a post is requested
app.post('/posts/:id/delete', login, async (req, res) => {

    //delete from blogs and update in results array
    await database.query("DELETE FROM blogs WHERE blog_id = $1 AND creator_user_name = $2",
        [req.params.id, req.session.user.user_name]);

    //redirect to homepage
    res.redirect("/");
});

//sign up
app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => { 
    //user login variable
    const {user_name, password, name} = req.body;

    //check if the id or username is taken
    const username_exists = await database.query("SELECT * FROM users WHERE user_name = $1", [user_name]);
    if (username_exists.rows.length >0)
    {
        return res.render("signup", {error: "username is taken. Please create a different username."});
    }
    //else save
    else
    {
        await database.query("INSERT INTO users (user_name, password, name) VALUES ($1, $2, $3)",
            [user_name,password,name]);
        
        //direct to login page
        res.redirect("/login");
    }


});

//get login page
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

//login
app.post("/login", async (req, res) => {
    //user_name and password variable
    const {user_name,password} = req.body;

    //search for user with same username and password
    const results = await database.query("SELECT * FROM users WHERE user_name = $1 AND password = $2",
        [user_name, password]
    );

    //if there arent any found
    if (results.rows.length == 0) {
        return res.render("login", { error: "Incorrect username or password. Try again."});
    }

    //if found, store user in session
    req.session.user = {
        user_name: results.rows[0].user_name,
        name: results.rows[0].name
    };
    //redirect to homepage
    res.redirect("/");
});

//logout
app.get("/logout", (req, res)=> {
    //end user session
    req.session.destroy();
    res.redirect("/login");

})

//deny access to hompage until user is logged in
function login(req, res, next) {
    //check if there is a current user through session varaible
    if (!req.session.user) 
    {
        //if not, redirect to login
        return res.redirect("/login");
    }
    //allow for route requests requiring login to be made
    next();
}