import React from "react";

const Header = () => {
  return (
    <header style={styles.header}>
      <h3 style={styles.logo}>💬 One To One chat Web 💬</h3>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: "darkorange",
    color: "#fff",
    padding: "12px 20px",
    textAlign: "center",
    fontSize: "1.6rem",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  logo: {
    margin: 0,
  },
};

export default Header;
