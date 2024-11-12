const nodemailer = require("nodemailer");
const jwtP = require("jsonwebtoken");
const crypto = require("crypto");

function generatePassword(input) {
  const hash = crypto.createHash("sha256");
  hash.update(input);

  const hashedString = hash.digest("hex");

  return hashedString.substring(0, 10);
}

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

async function checkUser(email) {
  let data = await fetch(
    `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
  );
  data = await data.json();

  return data.length !== 0;
}

async function saveOTP(email, otp, name) {
  const body = {
    email,
    otp,
    name,
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

  return result;
}

async function checkOTP(email, otp) {
  let data = await fetch(
    `${process.env.STRAPI_URL}/api/otps?filters[email][$eq]=${email}&sort[0]=createdAt:desc`
  );
  data = await data.json();

  if (data.data.length == 0) {
    return {
      success: false,
      message: "OTP not matched",
    };
  }

  const row = data.data[0];
  console.log(row);

  const expiry = new Date(row.expiry);
  const now = new Date();

  if (expiry < now) {
    return {
      success: false,
      message: "OTP expired",
    };
  }

  if (row.otp !== otp) {
    return {
      success: false,
      message: "OTP not matched",
    };
  }

  return {
    success: true,
    row,
  };
}

async function getAllApplicants(benefits) {
  const array = await Promise.all(
    benefits.map(async (benefit) => {
      try {
        const applicant_entries = await fetch(
          `${process.env.STRAPI_URL}/api/applications?filters[content_id][$eq]=${benefit.id}&pagination[pageSize]=5000`
        );
        const applicant_entries_json = await applicant_entries.json();
        return applicant_entries_json.data;
      } catch (error) {
        console.log("getAllApplicants (failure): ", error);
        return [];
      }
    })
  );

  return array.flat();
}

async function getCountOfApplicantsPerBenefit(benefits) {
  const counts = await Promise.all(
    benefits.map(async (benefit) => {
      try {
        const applicant_entries = await fetch(
          `${process.env.STRAPI_URL}/api/applications?filters[content_id][$eq]=${benefit.id}`
        );
        const applicant_entries_json = await applicant_entries.json();
        return {
          id: benefit.id,
          title: benefit.name,
          totalApplications: applicant_entries_json.meta.pagination.total,
          totalDisbursed: 100000,
        };
      } catch (error) {
        console.log("getCountOfApplicantsPerBenefit (failure): ", error);
        return {
          id: benefit.id,
          title: benefit.name,
          totalApplications: NaN,
          totalDisbursed: 100000,
        };
      }
    })
  );

  return counts;
}

async function getBenefitSummary(benefits) {
  const summary = await Promise.all(
    benefits.map(async (benefit) => {
      try {
        const applicant_entries = await fetch(
          `${process.env.STRAPI_URL}/api/applications?filters[content_id][$eq]=${benefit.id}`
        );
        const applicant_entries_json = await applicant_entries.json();
        return {
          id: benefit.id,
          documentId: benefit.documentId,
          name: benefit.name,
          applicants: applicant_entries_json.meta.pagination.total,
          approved: applicant_entries_json.data.filter(
            (obj) => obj.application_status === "approved"
          ).length,
          rejected: applicant_entries_json.data.filter(
            (obj) => obj.application_status === "rejected"
          ).length,
          disbursalPending: applicant_entries_json.meta.pagination.total,
          deadline: benefit.application_deadline,
          status: "active",
        };
      } catch (error) {
        console.log("getBenefitSummary (failure): ", error);
        return {
          id: benefit.id,
          documentId: benefit.documentId,
          name: benefit.name,
          applicants: NaN,
          approved: NaN,
          rejected: NaN,
          disbursalPending: NaN,
          deadline: null,
          status: null,
        };
      }
    })
  );

  return summary;
}

async function getApplicationOverview(id) {
  try {
    let benefitsData = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
    );
    benefitsData = await benefitsData.json();

    let benefits = benefitsData.data;

    let allApplicants = await getAllApplicants(benefits);

    const submittedCount = allApplicants.length;
    const approvedCount = allApplicants.filter(
      (obj) => obj.application_status === "approved"
    ).length;
    const rejectedCount = allApplicants.filter(
      (obj) => obj.application_status === "rejected"
    ).length;

    const application_overview = [
      {
        id: 1,
        label: "Total Applicants",
        count: submittedCount,
      },
      {
        id: 2,
        label: "Accepted Applicants",
        count: approvedCount,
      },
      {
        id: 3,
        label: "Rejected Applicants",
        count: rejectedCount,
      },
    ];

    return application_overview;
  } catch (error) {
    console.log("getApplicationOverview (failure): ", error);
    return [
      {
        id: 1,
        label: "Total Applicants",
        count: NaN,
      },
      {
        id: 2,
        label: "Accepted Applicants",
        count: NaN,
      },
      {
        id: 3,
        label: "Rejected Applicants",
        count: NaN,
      },
    ];
  }
}

async function getFinancialOverview(id) {
  try {
    let benefitsData = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}&populate[sponsors]=*`
    );
    benefitsData = await benefitsData.json();

    let benefits = benefitsData.data;
    let totalAmt = 0,
      totalSponsors = 0;

    benefits.forEach((benefit) => {
      totalAmt += benefit.price;
      totalSponsors += benefit.sponsors.length;
    });

    return {
      totalBudget: totalAmt,
      totalSponsors: totalSponsors,
      utilized: totalAmt * 0.7,
      remaining: totalAmt * 0.3,
    };
  } catch (error) {
    console.log("getFinancialOverview (failure): ", error);
    return {
      totalBudget: NaN,
      totalSponsors: NaN,
      utilized: NaN,
      remaining: NaN,
    };
  }
}

async function getTop3benefits(id) {
  try {
    let benefitsData = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
    );
    benefitsData = await benefitsData.json();

    let benefits = benefitsData.data;
    let counts = await getCountOfApplicantsPerBenefit(benefits);

    counts.sort((a, b) => b.totalApplications - a.totalApplications);

    return counts;
  } catch (error) {
    console.log("getTop3benefits (failure): ", error);
    return [];
  }
}

async function getAllBenefitsSummary(id) {
  try {
    let benefitsData = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
    );
    benefitsData = await benefitsData.json();

    let benefits = benefitsData.data;
    const summary = await getBenefitSummary(benefits);
    return summary;
  } catch (error) {
    console.log("getAllBenefitsSummary (failure): ", error);
    return [];
  }
}

async function getVisualData(id) {
  try {
    let benefitsData = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
    );
    benefitsData = await benefitsData.json();

    let benefits = benefitsData.data;
    const applicants = await getAllApplicants(benefits);

    const maleCount = applicants.filter(
        (obj) => obj.gender.toLocaleLowerCase() === "male"
      ).length,
      femaleCount = applicants.filter(
        (obj) => obj.gender.toLocaleLowerCase() === "female"
      ).length,
      otherGenderCount = applicants.length - maleCount - femaleCount;
    const gender = [
      {
        label: "Male",
        count: maleCount,
      },
      {
        label: "Female",
        count: femaleCount,
      },
      {
        label: "Other",
        count: otherGenderCount,
      },
    ];

    const scCount = applicants.filter(
        (obj) => obj.caste.toLocaleLowerCase() === "sc"
      ).length,
      stCount = applicants.filter(
        (obj) => obj.caste.toLocaleLowerCase() === "st"
      ).length,
      obcCount = applicants.filter(
        (obj) => obj.caste.toLocaleLowerCase() === "obc"
      ).length,
      generalCount = applicants.filter(
        (obj) => obj.caste.toLocaleLowerCase() === "general"
      ).length,
      otherCasteCount =
        applicants.length - scCount - stCount - obcCount - generalCount;
    const caste = [
      {
        label: "SC",
        count: scCount,
      },
      {
        label: "ST",
        count: stCount,
      },
      {
        label: "OBC",
        count: obcCount,
      },
      {
        label: "General",
        count: generalCount,
      },
      {
        label: "Other",
        count: otherCasteCount,
      },
    ];

    const dayscholarCount = applicants.filter(
        (obj) => obj.resident_type === "Dayscholar"
      ).length,
      hostellerCount = applicants.filter(
        (obj) => obj.resident_type === "Hosteler"
      ).length,
      otherResidentCount = applicants.length - dayscholarCount - hostellerCount;
    const ratio = [
      {
        label: "Dayscholar",
        count: dayscholarCount,
      },
      {
        label: "Hosteler",
        count: hostellerCount,
      },
      {
        label: "Other",
        count: otherResidentCount,
      },
    ];

    const std9Count = applicants.filter((obj) => obj.class === 9).length,
      std10Count = applicants.filter((obj) => obj.class === 10).length;
    const standard = [
      {
        label: "9th Std.",
        count: std9Count,
      },
      {
        label: "10th Std.",
        count: std10Count,
      },
    ];

    return {
      gender,
      caste,
      ratio,
      standard,
    };
  } catch (error) {
    console.log("getVisualData (failure): ", error);
    return {
      gender: [],
      caste: [],
      ratio: [],
      standard: [],
    };
  }
}

exports.registerProvider = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpCheck = await checkOTP(email, otp);
    if (!otpCheck.success) {
      return res.status(400).json({
        success: otpCheck.success,
        message: otpCheck.message,
      });
    }
    const row = otpCheck.row;

    const password = generatePassword(row.name);
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
          password: password,
        }),
      }
    );
    result = await result.json();

    if (result.error) {
      console.log("Error in registration: ", result.error);
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
    const otpCheck = await checkOTP(email, otp);
    if (!otpCheck.success) {
      return res.status(400).json({
        success: otpCheck.success,
        message: otpCheck.message,
      });
    }
    const row = otpCheck.row;

    data = await fetch(
      `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
    );
    data = await data.json();
    data = data[0];

    const password = generatePassword(data.username);
    let result = await fetch(`${process.env.STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: email,
        password: password,
      }),
    });
    result = await result.json();

    if (result.error) {
      console.log("Error in login: ", result.error);
      return res.status(500).json({
        success: false,
        message: "Error in login",
        error: result.error,
      });
    }

    await fetch(`${process.env.STRAPI_URL}/api/otps/${row.documentId}`, {
      method: "DELETE",
    });

    return res.status(200).json({
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
  try {
    const { email, name } = req.body;

    const userExists = await checkUser(email);
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Provider with this email already exists, try login",
      });
    }

    const otp = generateOTP();

    const result = await saveOTP(email, otp, name);

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
    console.log("otpForReg (failure): ", error);
    return res.status(500).json({
      success: false,
      message: "Error in Registration OTP...",
      error,
    });
  }
};

exports.otpForLog = async (req, res) => {
  const { email } = req.body;

  try {
    const userExists = await checkUser(email);
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "Provider with this email does not exist, try registering",
      });
    }

    const otp = generateOTP();

    const result = await saveOTP(email, otp);

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
      message: "Error in Login OTP...",
      error,
    });
  }
};

exports.getOverview = async (req, res) => {
  try {
    const { id } = req.params;
    // const jwtId = req.jwtId;

    // if (Number(id) !== jwtId) {
    //   return res.status(401).json({
    //     success: false,
    //     message:
    //       "Unauthorized to access this resourse (Login with appropriate credentials)",
    //   });
    // }

    const application_overview = await getApplicationOverview(id);
    const top_3_benefits = await getTop3benefits(id);
    const benefit_summary = await getAllBenefitsSummary(id);
    const visualData = await getVisualData(id);
    const financialOverview = await getFinancialOverview(id);

    return res.status(200).json({
      application_overview,
      financialOverview,
      top_3_benefits,
      benefit_summary,
      visualData,
    });
  } catch (error) {
    console.log("Error in Dashboard API: ", error);
    return res.status(500).json({
      success: false,
      message: "Error in Dashboard API",
      error,
    });
  }
};
