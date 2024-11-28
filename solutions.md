# Issue: [bet handling while getting the ball to fall]

## Problem Description
- What was the unexpected behavior?
  - the major issue was the ball was not falling when I created the betting function
- What should have happened instead?
  - the ball should have dropped when the user entered a bet amount
- How was this issue discovered?
  - once I created the validation, when no bet was inputted it displayed the error message correctly however, when the bet was inputted the ball did not drop.

## Root Cause Analysis
- What was the underlying cause?
  - While the bet amount was validated, there was no mechanism to actually allow the ball to drop for a specified number of balls (ballAmount was not being handled). Therefore, the chip animation was not triggered even after validation.
- What assumptions were incorrect?
  - The assumption that ballAmount could be directly managed through validation without properly implementing the logic to drop multiple balls. The game assumed that one ball would drop automatically with the input bet, but this was not set up correctly.
- What dependencies were involved?
  - The bet validation logic (validateBet) was dependent on a valid ballAmount to trigger the ball drop mechanism. The interaction between the bet input and the dropChip function was also crucial for initiating the ball drop.

## Resolution
- How was it fixed? (or planned fix if unresolved)
  - I added a default value for ball amount being 1 therefore it was validated as a true clause
- What alternatives were considered?
  - Implementing a function so that the user can input the number of balls they wanted however, I would have to revamp a lot of parts of the code for it to work so I just went with the idea of setting a default value of 1.

## Prevention
- How can similar issues be prevented?
  - Ensure that if I have something validated to make sure that there was aa thing to validate in the first place e.g. the ball amount or implement all functions needed before proceeding with the rest of the code 
- What lessons were learned?
  - Always ensure that input handling and related actions are explicitly tied together.
- What warning signs should be watched for?
  - If adding new features or validations results in components not triggering as expected, check if there is missing logic or miscommunication between different parts of the system.