import {
  ApartmentsTile,
  Home,
  Rectangle1,
  imgLine,
  imgMenu,
} from './figma/topbar.generated';
import homeLogo from '../assets/homeLogo.png';
import {LEFT_CATEGORIES, RIGHT_CATEGORIES} from '../feed/categories';
import styles from './TopBar.module.css';

const TILE_CLASS =
  'content-stretch flex flex-col gap-[20px] h-[145px] items-center px-[13px] py-[8px] relative shrink-0 w-[138px]';

function CategoryTile({category, selected, onSelect}) {
  return (
    <button
      type="button"
      className={styles.tile}
      aria-pressed={selected}
      aria-label={category.name}
      onClick={() => onSelect(category.id)}>
      {category.tile === 'apartments' ? (
        <ApartmentsTile selected={selected} />
      ) : (
        <Rectangle1
          className={category.tile === 'Variant13' ? TILE_CLASS.replace('gap-[20px]', 'gap-[28px]') : TILE_CLASS}
          property1={category.tile}
          selected={selected}
        />
      )}
    </button>
  );
}

export default function TopBar({selectedCategory, onSelectCategory, onHome, onMenu}) {
  const renderGroup = list =>
    list.map(category => (
      <CategoryTile
        key={category.id}
        category={category}
        selected={category.id === selectedCategory}
        onSelect={onSelectCategory}
      />
    ));

  return (
    <header className={styles.bar}>
      <div className={styles.utilityRow}>
        <button type="button" className={styles.iconButton} aria-label="דף הבית" onClick={onHome}>
          <Home className="relative shrink-0 size-[40px]" />
        </button>
        <button type="button" className={styles.iconButton} aria-label="תפריט" onClick={onMenu}>
          <img src={imgMenu} alt="" width={40} height={40} />
        </button>
      </div>
      <img className={styles.line} src={imgLine} alt="" />
      <nav className={styles.strip} aria-label="קטגוריות">
        <div className={styles.group}>{renderGroup(LEFT_CATEGORIES)}</div>
        <button type="button" className={styles.logo} aria-label="Pi 2701" onClick={onHome}>
          <img className={styles.logoImage} src={homeLogo} alt="" width={150} height={141} />
        </button>
        <div className={styles.group}>{renderGroup(RIGHT_CATEGORIES)}</div>
      </nav>
    </header>
  );
}
