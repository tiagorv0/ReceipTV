import { BANKS, detectBank } from '../utils/banks';

const BankTag = ({ bank }) => {
    const bankKey = detectBank(bank);
    const bankInfo = BANKS[bankKey] || BANKS.outro;

    return (
        <span
            className="inline-flex items-center justify-center min-w-[70px] text-center text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: bankInfo.bg, color: bankInfo.color }}
        >
            {bankInfo.name}
        </span>
    );
};

export default BankTag;
