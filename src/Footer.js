import React from "react";

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <p style={styles.text}>
      🖤 Made by Vini 🖤
              
          </p>
          {/* <p style={styles.text}>
              
              • © {new Date().getFullYear()}
      </p> */}
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: "black",
    padding: "10px 20px",
    textAlign: "center",
    fontSize: "0.85rem",
    borderTop: "1px solid #ccc",
  },
  text: {
    margin: 0,
    color: "#ffffff",
  },
};

export default Footer;
