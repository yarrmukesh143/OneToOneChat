import React from "react";

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <p style={styles.text}>
              🚀❤️❤️ Made by Muku with❤️ 🥰🥰
              
          </p>
          <p style={styles.text}>
              
              • © {new Date().getFullYear()}
      </p>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: "#f1f0f0",
    padding: "10px 20px",
    textAlign: "center",
    fontSize: "0.85rem",
    borderTop: "1px solid #ccc",
  },
  text: {
    margin: 0,
    color: "#444",
  },
};

export default Footer;
