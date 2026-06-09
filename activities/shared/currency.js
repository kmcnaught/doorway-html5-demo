/** Currency formatting for Doorway activities.
 * All values are in pence (integer).
 */

export function formatCurrency(pence)
{
    if (pence < 100)
    {
        return pence + "p";
    }
    return "\xA3" + (pence / 100).toFixed(2);
}
