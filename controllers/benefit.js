const {
  validateDeadline,
  validateSponsorShares,
} = require("../middleware/validateData");

exports.createBenefit = async (req, res) => {
  try {
    const benefit = req.body;
    const jwt = req.jwt;

    if (benefit.data.is_published) {
      if (
        !validateDeadline(
          benefit.data.application_deadline,
          benefit.data.extended_deadline
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Extended deadline should be none or greater than application deadline",
        });
      }

      if (!validateSponsorShares(benefit.data.sponsors)) {
        return res.status(400).json({
          success: false,
          message: "Sum of shares of all sponsors should be 100",
        });
      }
    }

    const strapi_result = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(benefit),
      }
    );
    const result = await strapi_result.json();

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Benefit Created Successfully",
      result,
    });
  } catch (error) {
    console.log("Error in createing benefit:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
};

exports.getBenefitDetails = async (req, res) => {
  try {
    const { documentId } = req.params;

    // const jwtId = req.jwtId;

    if (!documentId || typeof documentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID provided",
      });
    }

    let benefit = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships/${documentId}?populate[provider][fields]=id&populate[sponsors]=*&fields=price,application_deadline`
    );
    benefit = await benefit.json();

    if (benefit.error) {
      return res.status(400).json({
        success: false,
        error: benefit.error,
      });
    }
    benefit = benefit.data;

    // if (jwtId !== benefit.provider.id) {
    //   return res.status(401).json({
    //     success: false,
    //     message:
    //       "Unauthorized to access this resource (Login with appropriate credentials)",
    //   });
    // }

    return res.status(200).json({
      success: true,
      benefit,
    });
  } catch (error) {
    console.log("Error in getting benefit:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
};
