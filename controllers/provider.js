const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const salt = process.env.BCRYPT_SALT;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function sendEmail(email, otp) {
  const mailOptions = {
    from: "vidyaranya.gavai@tekditechnologies.com",
    to: email,
    subject: "OTP for Verification",
    text: `Your OTP for verification is: ${otp}`,
  };

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    auth: {
      user: "vidyaranya.gavai@tekditechnologies.com",
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log("Error Ocurred: ", err);
    } else {
      console.log("OTP Sent: ", info.response);
    }
  });
}

exports.registerProvider = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let data = await fetch(
      `${process.env.STRAPI_URL}/api/otps?filters[email][$eq]=${email}&sort[0]=createdAt:desc`
    );
    data = await data.json();

    if (data.data.length == 0) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    const row = data.data[0];

    const expiry = new Date(row.expiry);
    const now = new Date();

    if (expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (row.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    let result = await fetch(
      `${process.env.STRAPI_URL}/api/auth/local/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: row.name,
          email: row.email,
          password: row.name,
        }),
      }
    );
    result = await result.json();

    if (result.error) {
      console.log("Error in registration: ", error);
      return res.status(500).json({
        success: false,
        message: "Error in registration",
        error: result.error,
      });
    }

    await fetch(`${process.env.STRAPI_URL}/api/otps/${row.documentId}`, {
      method: "DELETE",
    });

    return res.status(200).json({
      success: true,
      message: "Registered successfully...",
      result,
    });
  } catch (error) {
    console.log("Error in reg: ", error);
    return res.status(500).json({
      success: false,
      message: "Error in registration...",
      error,
    });
  }
};

exports.login = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let data = await fetch(
      `${process.env.STRAPI_URL}/api/otps?filters[email][$eq]=${email}&sort[0]=createdAt:desc`
    );
    data = await data.json();

    if (data.data.length == 0) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    const row = data.data[0];

    const expiry = new Date(row.expiry);
    const now = new Date();

    if (expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (row.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    data = await fetch(
      `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
    );
    data = await data.json();
    data = data[0];

    let result = await fetch(`${process.env.STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: email,
        password: data.username,
      }),
    });
    result = await result.json();

    if (result.error) {
      console.log("Error in login: ", error);
      return res.status(500).json({
        success: false,
        message: "Error in login",
        error: result.error,
      });
    }

    await fetch(`${process.env.STRAPI_URL}/api/otps/${row.documentId}`, {
      method: "DELETE",
    });

    return res.status(500).json({
      success: true,
      message: "Logged in successfully...",
      result,
    });
  } catch (error) {
    console.log("Error in login: ", error);
    return res.status(500).json({
      success: false,
      message: "Error in login...",
      error,
    });
  }
};

exports.otpForReg = async (req, res) => {
  const { email, name } = req.body;

  let data = await fetch(
    `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
  );
  data = await data.json();

  if (data.length != 0) {
    return res.status(400).json({
      success: false,
      message: "Provider with this email already exists, try login",
    });
  }

  const otp = generateOTP();

  const body = {
    email,
    name,
    otp,
    expiry: Date.now() + 3600000,
  };

  let result = await fetch(`${process.env.STRAPI_URL}/api/otps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: body,
    }),
  });
  result = await result.json();

  if (result.error) {
    console.log("Strapi Error: ", result.error);
    return res.status(400).json({
      success: false,
      message: "Error occured, try again",
      error: result.error,
    });
  }

  sendEmail(email, otp);

  return res.status(200).json({
    success: true,
    message: `OTP sent to ${email}`,
  });
};

exports.otpForLog = async (req, res) => {
  const { email } = req.body;

  try {
    let data = await fetch(
      `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
    );
    data = await data.json();

    if (data.length == 0) {
      return res.status(400).json({
        success: false,
        message: "Provider with this email does not exist, try registering",
      });
    }

    const otp = generateOTP();

    const body = {
      email,
      otp,
      expiry: Date.now() + 3600000,
    };

    let result = await fetch(`${process.env.STRAPI_URL}/api/otps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: body,
      }),
    });
    result = await result.json();

    if (result.error) {
      console.log("Strapi Error: ", result.error);
      return res.status(400).json({
        success: false,
        message: "Error occured, try again",
        error: result.error,
      });
    }

    sendEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in OTP...",
      error,
    });
  }
};
