const Groq = require('groq-sdk');

// console.log('Groq key loaded:', process.env.GROQ_API_KEY?.slice(0, 10));

// timeout + maxRetries so a slow Groq can never hang a request for a minute
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 8000, maxRetries: 1 }) : null;

// Instant, no-network explanation used when the AI is slow, fails, or has no API key.
exports.fallbackExplanation = ({ selectedWarehouse, scoreData, otherCount }) => {
  const factors = [
    ['proximity to the customer', scoreData.distWeighted],
    ['stock availability', scoreData.invWeighted],
    ['delivery speed', scoreData.delWeighted],
    ['low shipping cost', scoreData.costWeighted]
  ].sort((a, b) => b[1] - a[1]);
  const why = otherCount === 0
    ? `${selectedWarehouse} was the only eligible warehouse for this order.`
    : `${selectedWarehouse} had the best overall balance among ${otherCount + 1} eligible warehouses, led by ${factors[0][0]} and ${factors[1][0]}.`;
  return `${why} It is about ${scoreData.distance_km.toFixed(0)} km from the customer, with an estimated delivery of ${scoreData.delivery_days.toFixed(1)} days.`;
};

exports.generateExplanation = async ({ productName, selectedWarehouse, distance, inventory, deliveryDays, cost, finalScore, distScore, invScore, delScore, costScore, weights, rejectedWarehouses }) => {
  try {
    if (!groq) {
      return null;
    }


    const promptText = `
You are an expert logistics AI for an Order Routing Engine. We just routed an order for "${productName}".
The selected warehouse is ${selectedWarehouse}.

Current Routing Configuration (Weights):
- Distance: ${weights.distanceWeight}%
- Inventory Health: ${weights.inventoryWeight}%
- Delivery Speed: ${weights.deliveryWeight}%
- Cost Efficiency: ${weights.costWeight}%

Normalized Scores for the winning warehouse (0.0 = Worst, 1.0 = Best):
- Distance Score: ${distScore.toFixed(4)}
- Inventory Score: ${invScore.toFixed(4)}
- Delivery Score: ${delScore.toFixed(4)}
- Cost Score: ${costScore.toFixed(4)}
- Final Routing Score: ${finalScore.toFixed(4)}

Raw Metrics for the winning warehouse:
- Distance: ${distance.toFixed(2)} km
- Inventory Available: ${inventory}
- Delivery Estimate: ${deliveryDays} days
- Cost Estimate: ₹${cost.toFixed(2)}

Other candidate warehouses that were considered and rejected:
${rejectedWarehouses.map(s => `- ${s.warehouseName}: Final Score ${s.finalScore.toFixed(4)} (Dist: ${s.distScore.toFixed(4)}, Inv: ${s.invScore.toFixed(4)}, Del: ${s.delScore.toFixed(4)}, Cost: ${s.costScore.toFixed(4)})`).join('\n')}

Please provide a concise, business-friendly explanation (max 3 sentences) in plain English of why ${selectedWarehouse} was chosen over the others based on the configured weights and their respective scores. Be professional and clear.
NEVER mentions scores to user. They are for your understanding.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: promptText }],
      model: "llama-3.1-8b-instant",
      max_tokens: 150,
    });

    return chatCompletion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Groq API Error:', error.message);
    return null; // caller will use the fallback text
  }
};
