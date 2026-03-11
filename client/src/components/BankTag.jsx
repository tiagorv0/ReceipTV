import { BANKS, detectBank } from '../utils/banks';

const BankTag = ({ bank, style = {} }) => {
    const bankKey = detectBank(bank);
    const bankInfo = BANKS[bankKey] || BANKS.outro;

    return (
        <span
            className="bank-tag"
            style={{
                background: bankInfo.bg,
                color: bankInfo.color,
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '70px',
                textAlign: 'center',
                ...style
            }}
        >
            {bankInfo.name}
        </span>
    );
};

export default BankTag;
