const apiUrl = "https://ptpback.onrender.com"; 
let authToken = "";



// Login User
document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.token) {
        authToken = data.token;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", data.username || email); // store username or email
        document.getElementById("loginMessage").innerText = "Login Successful!";

        setTimeout(() => {
            window.location.href = "index.html";
        }, 500);
    } else {
        document.getElementById("loginMessage").innerText = data.message || "Login failed";
    }
});

// Logout function
function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}

// Update Navbar
document.addEventListener("DOMContentLoaded", function () {
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    const listingsLinks = document.querySelectorAll(".listings-link");
    if (!isLoggedIn) {
        listingsLinks.forEach(link => {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                window.location.href = "login.html";
            });
        });
    }

    // Fetch navbar HTML and initialize components
    fetch("navbar.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("navbar-container").innerHTML = data;

            M.Sidenav.init(document.querySelectorAll(".sidenav"));
            M.Dropdown.init(document.querySelectorAll(".dropdown-trigger"), {
                hover: true,
                alignment: 'right',
                coverTrigger: false,
            });

            if (isLoggedIn) {
                // Hide login and signup links, show logout
                document.getElementById("login-link").style.display = "none";
                document.getElementById("signup-link").style.display = "none";
                document.getElementById("logout-link").style.display = "block";
                
                // Show "Messages" option only if logged in
                document.getElementById("messages-link").style.display = "block";
                document.getElementById("donate-link").style.display = "block";
            } else {
                // Add event listeners to links that require login
                document.getElementById("profile-link").addEventListener("click", function (event) {
                    event.preventDefault();
                    window.location.href = "login.html";  // Redirect to login page
                });
                document.querySelector('a[href="mybooks.html"]').addEventListener("click", function (event) {
                    event.preventDefault();
                    window.location.href = "login.html";  // Redirect to login page
                });
                document.querySelector('a[href="transactions.html"]').addEventListener("click", function (event) {
                    event.preventDefault();
                    window.location.href = "login.html";  // Redirect to login page
                });
            }
        });

        if (window.location.pathname.includes("browse.html")) {
            displayAllBooks();
        } else {
            displayBooks();
        }
        
    loadListings();
    loadRecipientOptions();
    loadMessages();
    setupCheckboxFilters();
    M.FormSelect.init(document.querySelectorAll("select"));
});

//Fetch footer
fetch('footer.html')
.then(response => response.text())
.then(data => {
  document.getElementById('footer-placeholder').innerHTML = data;
})
.catch(error => console.error('Error loading footer:', error));


// Register
document.getElementById("registerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const first_name = document.getElementById("regFirstName").value;
    const last_name = document.getElementById("regLastName").value;

    const response = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, first_name, last_name }),
    });

    const data = await response.json();
    document.getElementById("registerMessage").innerText = data.message || "Registration failed";

    if (data.message && data.message.toLowerCase().includes("success")) {
        const loginResponse = await fetch(`${apiUrl}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (loginData.token) {
            authToken = loginData.token;
            localStorage.setItem("authToken", authToken);
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("currentUser", loginData.username || email);

            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        } else {
            document.getElementById("registerMessage").innerText = "Registered, but login failed.";
        }
    }
});

// Listings
function loadListings() {
    const list = document.getElementById("listings");
    if (!list) return;

    const listings = JSON.parse(localStorage.getItem("listings")) || [];
    list.innerHTML = "";

    listings.forEach((book, index) => {
        const item = document.createElement("li");
        item.className = "collection-item";
        item.innerHTML = `${book} <a href="#!" class="secondary-content red-text" onclick="removeListing(${index})"><i class="material-icons">delete</i></a>`;
        list.appendChild(item);
    });
}

function addListing() {
    const input = document.getElementById("listingInput");
    if (!input) return;
    const book = input.value.trim();
    if (book !== "") {
        const listings = JSON.parse(localStorage.getItem("listings")) || [];
        listings.push(book);
        localStorage.setItem("listings", JSON.stringify(listings));
        input.value = "";
        loadListings();
    }
}

function removeListing(index) {
    const listings = JSON.parse(localStorage.getItem("listings")) || [];
    listings.splice(index, 1);
    localStorage.setItem("listings", JSON.stringify(listings));
    loadListings();
}

// Messages
// Messages
let currentUser = null;
let currentRecipient = null;
const pollingInterval = 5000;

document.addEventListener("DOMContentLoaded", () => {
    const storedUser = localStorage.getItem("currentUser");
    const authToken = localStorage.getItem("authToken");

    // Get user ID of the current user from /users
    if (storedUser && authToken) {
        fetch(`${apiUrl}/users`, {
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        })
        .then(res => res.json())
        .then(users => {
            const user = users.find(u => u.username === storedUser || u.email === storedUser);
            if (user) {
                currentUser = user.user_id;
            }

            // Load recipient from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            currentRecipient = urlParams.get("user") || null;

            loadRecipientOptions();
            if (currentRecipient) loadMessages();
        });
    }

    // Send message on Enter
    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
        messageInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    // Polling
    setInterval(() => {
        if (currentRecipient) {
            loadMessages();
        }
    }, pollingInterval);
});

async function sendMessage() {
    const input = document.getElementById("messageInput");
    if (!input || !currentRecipient) return;

    const message = input.value.trim();
    if (!message) return;

    try {
        const response = await fetch(`${apiUrl}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("authToken")}`
            },
            body: JSON.stringify({
                receiver_user_id: parseInt(currentRecipient),
                message: message
            })
        });

        if (!response.ok) {
            console.error("Failed to send message");
            return;
        }

        input.value = "";
        loadMessages();
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

async function loadMessages() {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox || !currentRecipient || !currentUser) return;

    try {
        const response = await fetch(`${apiUrl}/messages?with=${currentRecipient}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("authToken")}`
            }
        });

        if (!response.ok) {
            console.error("Error fetching messages");
            return;
        }

        const messages = await response.json();
        chatBox.innerHTML = "";

        messages.forEach(msg => {
            const msgDiv = document.createElement("div");
            const isSender = msg.sender_user_id === currentUser;
            msgDiv.className = isSender ? "right-align blue-text" : "left-align green-text";
            msgDiv.innerHTML = `<strong>${isSender ? "You" : "Them"}:</strong> ${msg.message} <small class="grey-text">(${new Date(msg.sent_at).toLocaleString()})</small>`;
            chatBox.appendChild(msgDiv);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

async function loadRecipientOptions() {
    const select = document.getElementById("recipientSelect");
    if (!select || !localStorage.getItem("authToken")) return;

    try {
        const response = await fetch(`${apiUrl}/users`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("authToken")}`
            }
        });

        if (!response.ok) return;

        const users = await response.json();
        select.innerHTML = `<option value="" disabled selected>Select a user</option>`;

        users.forEach(user => {
            if (user.user_id !== currentUser) {
                const opt = document.createElement("option");
                opt.value = user.user_id;
                opt.textContent = user.username;
                select.appendChild(opt);
            }
        });

        M.FormSelect.init(select);

        select.addEventListener("change", function () {
            currentRecipient = this.value;
            loadMessages();
        });

        if (currentRecipient) {
            select.value = currentRecipient;
            M.FormSelect.init(select);
            loadMessages();
        }
    } catch (error) {
        console.error("Error loading recipient options:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const recipientSelect = document.getElementById("recipientSelect");
    const messageInput = document.getElementById("messageInput");
    const chatBox = document.getElementById("chatBox");

    // Fetch users and populate the recipient select
    fetch('/users')
        .then(response => response.json())
        .then(users => {
            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.user_id;
                option.textContent = user.username;
                recipientSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching users:', error));

    // Function to fetch messages
    function fetchMessages() {
        const recipientUserId = recipientSelect.value;
        const senderUserId = localStorage.getItem("currentUser");

        if (!recipientUserId || !senderUserId) {
            return; // If no user or recipient is selected, exit
        }

        fetch(`/messages?sender_user_id=${senderUserId}&receiver_user_id=${recipientUserId}`)
            .then(response => response.json())
            .then(data => {
                console.log('Fetched messages:', data);  // Log the fetched messages
                displayMessages(data);
            })
            .catch(error => console.error('Error fetching messages:', error));
    }

    // Function to display messages in the chat box
    function displayMessages(messages) {
        chatBox.innerHTML = ""; // Clear the chat box first

        messages.forEach(message => {
            const messageElement = document.createElement("div");
            messageElement.textContent = message.message;
            chatBox.appendChild(messageElement);
        });

        // Scroll to the bottom of the chat box
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Send a new message
    function sendMessage() {
        const messageText = messageInput.value;
        const recipientUserId = recipientSelect.value;

        if (!messageText || !recipientUserId) {
            return;  // Exit if no message or recipient is selected
        }

        const senderUserId = localStorage.getItem("currentUser");  // Assuming current user ID is stored in localStorage

        // Log the message data to be sent
        console.log('Sending message:', {
            sender_user_id: senderUserId,
            receiver_user_id: recipientUserId,
            message: messageText
        });

        fetch('/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender_user_id: senderUserId,
                receiver_user_id: recipientUserId,
                message: messageText
            })
        })
        .then(response => response.json())
        .then(() => {
            messageInput.value = "";  // Clear the input field
            fetchMessages();  // Refresh the messages list
        })
        .catch(error => console.error('Error sending message:', error));
    }

    // Add event listener to send button
    document.querySelector(".send-message-btn").addEventListener("click", sendMessage);

    // Add event listener to recipient select to fetch messages when a user is selected
    recipientSelect.addEventListener("change", fetchMessages);

    // Initially fetch messages if there's already a selected user
    if (recipientSelect.value) {
        fetchMessages();
    }
});




// books display
async function displayBooks() {
    const bookList = document.querySelector(".book-list");
    if (!bookList) return;

    try {
        const response = await fetch(`${apiUrl}/books`);
        const books = await response.json();

        bookList.innerHTML = "";

        // Show only the last 5 books
        const latestBooks = books.slice(-5).reverse();

        latestBooks.forEach((book, index) => {
            const bookCard = document.createElement("div");
            bookCard.classList.add("book-card");
            bookCard.innerHTML = `
                <img src="img/book${(index % 3) + 1}.png" alt="${book.title}">
                <h4>${book.title}</h4>
                <p>by ${book.author}</p>
            `;
            bookList.appendChild(bookCard);
        });
    } catch (error) {
        console.error("Error fetching books:", error);
    }
}

// display all books with pagination
const booksPerPage = 12;
let currentPage = 1;
let allBooks = [];

async function displayAllBooks() {
    const bookList = document.querySelector(".book-list");
    const searchInput = document.getElementById("searchInput");
    const filterCheckboxes = document.querySelectorAll(".filter-checkbox");

    if (!bookList || !searchInput) return;

    try {
        const response = await fetch(`${apiUrl}/books`);
        allBooks = await response.json();
        renderBooks(allBooks);
    } catch (error) {
        console.error("Error fetching all books:", error);
    }

    searchInput.addEventListener("input", applyFilters);
    filterCheckboxes.forEach(cb => cb.addEventListener("change", applyFilters));

    function renderBooks(books) {
        bookList.innerHTML = "";
        const paginatedBooks = paginateBooks(books, currentPage);

        paginatedBooks.forEach((book, index) => {
            const bookCard = document.createElement("div");
            bookCard.classList.add("book-card");
            bookCard.innerHTML = `
                <img src="img/book${(index % 3) + 1}.png" alt="${book.title}">
                <h4>${book.title}</h4>
                <p>by ${book.author}</p>
                <p><strong>Condition:</strong> ${book.condition}</p>
                <p><strong>Subject:</strong> ${book.subject}</p>
            `;
            bookList.appendChild(bookCard);
        });

        renderPagination(books.length);
    }

    function paginateBooks(books, page) {
        const start = (page - 1) * booksPerPage;
        return books.slice(start, start + booksPerPage);
    }

    function renderPagination(totalBooks) {
        const totalPages = Math.ceil(totalBooks / booksPerPage);
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = "waves-effect waves-light btn-small";
            if (i === currentPage) btn.classList.add("blue", "white-text");

            btn.addEventListener("click", () => {
                currentPage = i;
                displayBooks();
            });

            pagination.appendChild(btn);
        }
    }

    function applyFilters() {
        const query = searchInput.value.toLowerCase();

        const checkedFilters = Array.from(filterCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(cb => cb.value);

        const filtered = allBooks.filter(book => {
            const matchesSearch =
                book.title.toLowerCase().includes(query) ||
                book.author.toLowerCase().includes(query);

            const matchesFilter =
                checkedFilters.length === 0 ||
                checkedFilters.includes(book.condition) ||
                checkedFilters.includes(book.subject);

            return matchesSearch && matchesFilter;
        });

        currentPage = 1; // Reset to first page when filters change
        renderBooks(filtered);
    }
}

//Adding books
document.getElementById("addBookForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("bookTitle").value.trim();
    const author = document.getElementById("bookAuthor").value.trim();
    const description = document.getElementById("bookDescription").value.trim();
    const condition = document.getElementById("bookCondition").value;
    const subject = document.getElementById("bookSubject").value;

    // Create message element if it doesn't exist
    let feedback = document.querySelector(".booklisting-feedback-message-unique");
    if (!feedback) {
        feedback = document.createElement("div");
        feedback.className = "booklisting-feedback-message-unique";
        document.querySelector(".booklisting-form-wrapper").appendChild(feedback);
    }

    if (title && author && subject && condition) {
        const newBook = { title, author, description, condition, subject };

        try {
            const response = await fetch(`${apiUrl}/books`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify(newBook)
            });

            const data = await response.json();
            if (data.message === "Book added successfully!") {
                feedback.textContent = "📘 Thank you! Redirecting to your listings...";
                feedback.style.color = "red";
                feedback.style.marginTop = "1rem";
                feedback.style.fontWeight = "bold";
                setTimeout(() => {
                    window.location.href = "mybooks.html";
                }, 2000);
            } else {
                feedback.textContent = "❗ Failed to add book.";
            }
        } catch (error) {
            console.error(error);
            feedback.textContent = "❗ An error occurred while adding the book.";
        }
    } else {
        feedback.textContent = "❗ Please fill in all required fields.";
    }
});
