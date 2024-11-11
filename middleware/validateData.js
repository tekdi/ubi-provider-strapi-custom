exports.validateDeadline = (application_deadline, extended_deadline) => {
  const ad = new Date(application_deadline);

  if (extended_deadline == undefined) return true;
  const ed = new Date(extended_deadline);

  return ad < ed;
};

exports.validateSponsorShares = (sponsors) => {
  let sum = 0;

  for (let i = 0; i < sponsors.length; i++) {
    sum += sponsors[i].share_percent;
  }

  return sum == 100;
};
